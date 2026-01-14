//! Docker orchestration for Shell IDE
//!
//! Handles secure code execution in containers.
//! - One container per run
//! - Strict resource limits
//! - Timeouts enforced
//! - Read-only mounts where possible

use bollard::Docker;
use bollard::container::{Config, CreateContainerOptions, StartContainerOptions, LogsOptions, WaitContainerOptions};
use bollard::models::{HostConfig, Mount, MountTypeEnum};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::error::{Result, ShellError};

/// Default resource limits
const DEFAULT_MEMORY_LIMIT: i64 = 256 * 1024 * 1024; // 256 MB
const DEFAULT_CPU_PERIOD: i64 = 100_000; // 100ms
const DEFAULT_CPU_QUOTA: i64 = 50_000; // 50% of one CPU
const DEFAULT_TIMEOUT_SECONDS: u64 = 30;

pub struct DockerManager {
    client: Arc<Mutex<Option<Docker>>>,
    running_containers: Arc<Mutex<HashMap<String, ContainerInfo>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerInfo {
    pub id: String,
    pub execution_id: String,
    pub started_at: chrono::DateTime<chrono::Utc>,
    pub status: ContainerStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ContainerStatus {
    Starting,
    Running,
    Completed,
    TimedOut,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRequest {
    /// Unique execution ID
    pub id: String,
    /// Docker image to use
    pub image: String,
    /// Command to run
    pub command: Vec<String>,
    /// Working directory in container
    pub working_dir: String,
    /// Path to mount (read-only for source, read-write for output)
    pub source_path: String,
    /// Environment variables
    pub env: HashMap<String, String>,
    /// Memory limit in bytes (default: 256MB)
    pub memory_limit: Option<i64>,
    /// CPU quota (default: 50% of one CPU)
    pub cpu_quota: Option<i64>,
    /// Timeout in seconds (default: 30)
    pub timeout: Option<u64>,
    /// Enable step-by-step execution
    pub step_mode: bool,
    /// Capture stdin/stdout/stderr
    pub trace_io: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub id: String,
    pub exit_code: i64,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
    pub timed_out: bool,
    /// Execution trace for educational features
    pub trace: Option<ExecutionTrace>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionTrace {
    /// Step-by-step execution events
    pub steps: Vec<ExecutionStep>,
    /// IO events
    pub io_events: Vec<IoEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStep {
    pub timestamp_ms: u64,
    pub event_type: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoEvent {
    pub timestamp_ms: u64,
    pub stream: String, // "stdin", "stdout", "stderr"
    pub data: String,
}

impl DockerManager {
    pub fn new() -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            running_containers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Initialize Docker connection
    pub async fn connect(&self) -> Result<()> {
        let docker = Docker::connect_with_local_defaults()
            .map_err(|e| ShellError::Docker(e.to_string()))?;
        
        // Verify connection
        docker.ping().await
            .map_err(|e| ShellError::Docker(format!("Failed to connect to Docker: {}", e)))?;
        
        let mut client = self.client.lock().await;
        *client = Some(docker);
        
        Ok(())
    }

    /// Check if Docker is available
    pub async fn is_available(&self) -> bool {
        let client = self.client.lock().await;
        if let Some(docker) = client.as_ref() {
            docker.ping().await.is_ok()
        } else {
            // Try to connect
            drop(client);
            self.connect().await.is_ok()
        }
    }

    /// Run code in a container
    pub async fn run(&self, request: ExecutionRequest) -> Result<ExecutionResult> {
        let client = self.client.lock().await;
        let docker = client.as_ref()
            .ok_or_else(|| ShellError::Docker("Docker not connected".into()))?;

        let start_time = std::time::Instant::now();
        let execution_id = request.id.clone();

        // Build container configuration
        let host_config = HostConfig {
            memory: Some(request.memory_limit.unwrap_or(DEFAULT_MEMORY_LIMIT)),
            cpu_period: Some(DEFAULT_CPU_PERIOD),
            cpu_quota: Some(request.cpu_quota.unwrap_or(DEFAULT_CPU_QUOTA)),
            network_mode: Some("none".to_string()), // No network access
            mounts: Some(vec![
                Mount {
                    target: Some("/workspace".to_string()),
                    source: Some(request.source_path.clone()),
                    typ: Some(MountTypeEnum::BIND),
                    read_only: Some(true), // Source is read-only
                    ..Default::default()
                },
            ]),
            ..Default::default()
        };

        let env: Vec<String> = request.env
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();

        let config = Config {
            image: Some(request.image.clone()),
            cmd: Some(request.command.clone()),
            working_dir: Some(request.working_dir.clone()),
            env: Some(env),
            host_config: Some(host_config),
            ..Default::default()
        };

        // Create container
        let container_name = format!("shell-exec-{}", &execution_id[..8]);

        let container = docker.create_container(
            Some(CreateContainerOptions { name: container_name, platform: None }),
            config
        ).await
            .map_err(|e| ShellError::Docker(format!("Failed to create container: {}", e)))?;

        // Track running container
        {
            let mut running = self.running_containers.lock().await;
            running.insert(execution_id.clone(), ContainerInfo {
                id: container.id.clone(),
                execution_id: execution_id.clone(),
                started_at: chrono::Utc::now(),
                status: ContainerStatus::Starting,
            });
        }

        // Start container
        docker.start_container(&container.id, None::<StartContainerOptions<String>>).await
            .map_err(|e| ShellError::Docker(format!("Failed to start container: {}", e)))?;

        // Update status
        {
            let mut running = self.running_containers.lock().await;
            if let Some(info) = running.get_mut(&execution_id) {
                info.status = ContainerStatus::Running;
            }
        }

        // Wait for completion with timeout
        let timeout = request.timeout.unwrap_or(DEFAULT_TIMEOUT_SECONDS);
        let wait_result = tokio::time::timeout(
            std::time::Duration::from_secs(timeout),
            docker.wait_container(&container.id, None::<WaitContainerOptions<String>>).next()
        ).await;

        let (exit_code, timed_out) = match wait_result {
            Ok(Some(Ok(response))) => (response.status_code, false),
            Ok(_) => (-1, false),
            Err(_) => {
                // Timeout - kill the container
                let _ = docker.kill_container(&container.id, None::<bollard::container::KillContainerOptions<String>>).await;
                (-1, true)
            }
        };

        // Collect logs
        let log_options = LogsOptions::<String> {
            stdout: true,
            stderr: true,
            ..Default::default()
        };

        let mut stdout = String::new();
        let mut stderr = String::new();
        let mut io_events = Vec::new();

        let mut logs = docker.logs(&container.id, Some(log_options));
        while let Some(log) = logs.next().await {
            if let Ok(log) = log {
                match log {
                    bollard::container::LogOutput::StdOut { message } => {
                        let msg = String::from_utf8_lossy(&message).to_string();
                        if request.trace_io {
                            io_events.push(IoEvent {
                                timestamp_ms: start_time.elapsed().as_millis() as u64,
                                stream: "stdout".to_string(),
                                data: msg.clone(),
                            });
                        }
                        stdout.push_str(&msg);
                    }
                    bollard::container::LogOutput::StdErr { message } => {
                        let msg = String::from_utf8_lossy(&message).to_string();
                        if request.trace_io {
                            io_events.push(IoEvent {
                                timestamp_ms: start_time.elapsed().as_millis() as u64,
                                stream: "stderr".to_string(),
                                data: msg.clone(),
                            });
                        }
                        stderr.push_str(&msg);
                    }
                    _ => {}
                }
            }
        }

        // Cleanup container
        let _ = docker.remove_container(&container.id, None::<bollard::container::RemoveContainerOptions>).await;

        // Remove from tracking
        {
            let mut running = self.running_containers.lock().await;
            running.remove(&execution_id);
        }

        let duration_ms = start_time.elapsed().as_millis() as u64;

        Ok(ExecutionResult {
            id: execution_id,
            exit_code,
            stdout,
            stderr,
            duration_ms,
            timed_out,
            trace: if request.trace_io {
                Some(ExecutionTrace {
                    steps: Vec::new(), // TODO: Implement step tracing
                    io_events,
                })
            } else {
                None
            },
        })
    }

    /// Stop a running execution
    pub async fn stop(&self, execution_id: &str) -> Result<()> {
        let client = self.client.lock().await;
        let docker = client.as_ref()
            .ok_or_else(|| ShellError::Docker("Docker not connected".into()))?;

        let running = self.running_containers.lock().await;
        if let Some(info) = running.get(execution_id) {
            docker.kill_container(&info.id, None::<bollard::container::KillContainerOptions<String>>).await
                .map_err(|e| ShellError::Docker(format!("Failed to stop container: {}", e)))?;
        }

        Ok(())
    }

    /// Get status of running containers
    pub async fn get_running(&self) -> Vec<ContainerInfo> {
        let running = self.running_containers.lock().await;
        running.values().cloned().collect()
    }
}

impl Default for DockerManager {
    fn default() -> Self {
        Self::new()
    }
}
