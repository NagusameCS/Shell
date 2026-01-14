//! Service manager for Shell IDE
//!
//! Manages external processes including:
//! - LSP servers
//! - Test runners
//! - Graders
//!
//! Node.js is used as a tool, not the platform.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::error::{Result, ShellError};

pub struct ServiceManager {
    /// Running processes
    processes: Arc<Mutex<HashMap<String, ServiceProcess>>>,
    
    /// Service configurations
    configs: Arc<Mutex<HashMap<String, ServiceConfig>>>,
}

#[derive(Debug)]
pub struct ServiceProcess {
    pub id: String,
    pub service_type: ServiceType,
    pub child: Child,
    pub started_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub id: String,
    pub service_type: ServiceType,
    pub command: String,
    pub args: Vec<String>,
    pub working_dir: Option<PathBuf>,
    pub env: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ServiceType {
    /// Language Server Protocol server
    Lsp(String), // Language name
    /// Test runner
    TestRunner,
    /// Local grader
    Grader,
    /// Custom service
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub id: String,
    pub service_type: ServiceType,
    pub running: bool,
    pub started_at: Option<String>,
}

impl ServiceManager {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            configs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Register a service configuration
    pub async fn register(&self, config: ServiceConfig) {
        let mut configs = self.configs.lock().await;
        configs.insert(config.id.clone(), config);
    }

    /// Start a service
    pub async fn start(&self, id: &str) -> Result<()> {
        let configs = self.configs.lock().await;
        let config = configs.get(id)
            .ok_or_else(|| ShellError::Service(format!("Service not found: {}", id)))?
            .clone();
        drop(configs);

        // Check if already running
        let processes = self.processes.lock().await;
        if processes.contains_key(id) {
            return Ok(()); // Already running
        }
        drop(processes);

        // Start the process
        let mut cmd = Command::new(&config.command);
        cmd.args(&config.args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(dir) = &config.working_dir {
            cmd.current_dir(dir);
        }

        for (key, value) in &config.env {
            cmd.env(key, value);
        }

        let child = cmd.spawn()
            .map_err(|e| ShellError::Service(format!("Failed to start service: {}", e)))?;

        let process = ServiceProcess {
            id: id.to_string(),
            service_type: config.service_type,
            child,
            started_at: chrono::Utc::now(),
        };

        let mut processes = self.processes.lock().await;
        processes.insert(id.to_string(), process);

        Ok(())
    }

    /// Stop a service
    pub async fn stop(&self, id: &str) -> Result<()> {
        let mut processes = self.processes.lock().await;
        
        if let Some(mut process) = processes.remove(id) {
            process.child.kill()
                .map_err(|e| ShellError::Service(format!("Failed to stop service: {}", e)))?;
        }
        
        Ok(())
    }

    /// Get status of all services
    pub async fn status(&self) -> Vec<ServiceStatus> {
        let configs = self.configs.lock().await;
        let processes = self.processes.lock().await;
        
        configs.values().map(|config| {
            let process = processes.get(&config.id);
            ServiceStatus {
                id: config.id.clone(),
                service_type: config.service_type.clone(),
                running: process.is_some(),
                started_at: process.map(|p| p.started_at.to_rfc3339()),
            }
        }).collect()
    }

    /// Check if a service is running
    pub async fn is_running(&self, id: &str) -> bool {
        let processes = self.processes.lock().await;
        processes.contains_key(id)
    }

    /// Stop all services
    pub async fn stop_all(&self) -> Result<()> {
        let mut processes = self.processes.lock().await;
        
        for (_, mut process) in processes.drain() {
            let _ = process.child.kill();
        }
        
        Ok(())
    }
}

impl Default for ServiceManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for ServiceManager {
    fn drop(&mut self) {
        // Attempt to kill all child processes on drop
        if let Ok(mut processes) = self.processes.try_lock() {
            for (_, mut process) in processes.drain() {
                let _ = process.child.kill();
            }
        }
    }
}
