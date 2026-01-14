//! Execution IPC commands

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use crate::docker::{DockerManager, ExecutionRequest, ExecutionResult, ContainerInfo};
use crate::error::{Result, ShellError};

/// Request to run code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunCodeRequest {
    /// Language for execution
    pub language: String,
    /// Source code to run
    pub code: String,
    /// Project path
    pub project_path: String,
    /// Entry point file
    pub entry_point: Option<String>,
    /// Standard input to provide
    pub stdin: Option<String>,
    /// Environment variables
    pub env: Option<HashMap<String, String>>,
    /// Enable step-by-step mode
    pub step_mode: Option<bool>,
    /// Enable IO tracing
    pub trace_io: Option<bool>,
    /// Timeout in seconds
    pub timeout: Option<u64>,
}

/// Execution status response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStatus {
    pub running: bool,
    pub containers: Vec<ContainerInfo>,
}

/// Map language to Docker image
pub fn get_language_image(language: &str) -> Result<String> {
    let image = match language.to_lowercase().as_str() {
        "python" | "py" => "python:3.12-slim",
        "javascript" | "js" | "node" => "node:20-slim",
        "typescript" | "ts" => "node:20-slim",
        "rust" | "rs" => "rust:1.75-slim",
        "go" | "golang" => "golang:1.21-alpine",
        "java" => "eclipse-temurin:21-jdk",
        "c" | "cpp" | "c++" => "gcc:13",
        "ruby" | "rb" => "ruby:3.3-slim",
        _ => return Err(ShellError::Execution(format!("Unsupported language: {}", language))),
    };
    Ok(image.to_string())
}

/// Get command to run for a language
fn get_run_command(language: &str, entry_point: &str) -> Result<Vec<String>> {
    let cmd = match language.to_lowercase().as_str() {
        "python" | "py" => vec!["python".to_string(), entry_point.to_string()],
        "javascript" | "js" | "node" => vec!["node".to_string(), entry_point.to_string()],
        "typescript" | "ts" => vec!["npx".to_string(), "tsx".to_string(), entry_point.to_string()],
        "rust" | "rs" => vec!["cargo".to_string(), "run".to_string()],
        "go" | "golang" => vec!["go".to_string(), "run".to_string(), entry_point.to_string()],
        "java" => vec!["java".to_string(), entry_point.to_string()],
        "c" => vec!["sh".to_string(), "-c".to_string(), 
                    format!("gcc {} -o /tmp/a.out && /tmp/a.out", entry_point)],
        "cpp" | "c++" => vec!["sh".to_string(), "-c".to_string(), 
                              format!("g++ {} -o /tmp/a.out && /tmp/a.out", entry_point)],
        "ruby" | "rb" => vec!["ruby".to_string(), entry_point.to_string()],
        _ => return Err(ShellError::Execution(format!("Unsupported language: {}", language))),
    };
    Ok(cmd)
}

/// Run code in a container
#[tauri::command]
pub async fn run_code(
    request: RunCodeRequest,
    docker: State<'_, DockerManager>,
) -> Result<ExecutionResult> {
    // Ensure Docker is available
    if !docker.is_available().await {
        return Err(ShellError::Docker("Docker is not available. Please install and start Docker.".into()));
    }

    let image = get_language_image(&request.language)?;
    let entry_point = request.entry_point.as_deref().unwrap_or("main");
    let command = get_run_command(&request.language, entry_point)?;

    let exec_request = ExecutionRequest {
        id: uuid::Uuid::new_v4().to_string(),
        image,
        command,
        working_dir: "/workspace".to_string(),
        source_path: request.project_path,
        env: request.env.unwrap_or_default(),
        memory_limit: None,
        cpu_quota: None,
        timeout: request.timeout,
        step_mode: request.step_mode.unwrap_or(false),
        trace_io: request.trace_io.unwrap_or(true),
    };

    docker.run(exec_request).await
}

/// Stop a running execution
#[tauri::command]
pub async fn stop_execution(
    execution_id: String,
    docker: State<'_, DockerManager>,
) -> Result<()> {
    docker.stop(&execution_id).await
}

/// Get current execution status
#[tauri::command]
pub async fn get_execution_status(
    docker: State<'_, DockerManager>,
) -> Result<ExecutionStatus> {
    let containers = docker.get_running().await;
    Ok(ExecutionStatus {
        running: !containers.is_empty(),
        containers,
    })
}
