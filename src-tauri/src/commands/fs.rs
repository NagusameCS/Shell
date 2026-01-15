//! Filesystem IPC commands
//! Optimized to use shared security policy for better performance

use std::sync::Arc;
use tauri::State;
use crate::error::Result;
use crate::fs::{FileSystem, DirectoryContents, ProjectInfo};
use crate::security::SecurityPolicy;
use std::path::Path;

/// Read a project directory and return its structure
#[tauri::command]
pub async fn read_project(path: String) -> Result<ProjectInfo> {
    // Use spawn_blocking for file I/O to not block async runtime
    tokio::task::spawn_blocking(move || {
        let path = Path::new(&path);
        ProjectInfo::detect(path)
    }).await.map_err(|e| crate::error::ShellError::Execution(e.to_string()))?
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(
    path: String, 
    content: String,
    policy: State<'_, Arc<SecurityPolicy>>,
) -> Result<()> {
    let policy = Arc::clone(&policy);
    tokio::task::spawn_blocking(move || {
        let fs = FileSystem::new(policy);
        fs.write_file(Path::new(&path), &content)
    }).await.map_err(|e| crate::error::ShellError::Execution(e.to_string()))?
}

/// Create a new file
#[tauri::command]
pub async fn create_file(
    path: String, 
    content: Option<String>,
    policy: State<'_, Arc<SecurityPolicy>>,
) -> Result<()> {
    let policy = Arc::clone(&policy);
    tokio::task::spawn_blocking(move || {
        let fs = FileSystem::new(policy);
        fs.create_file(Path::new(&path), content.as_deref())
    }).await.map_err(|e| crate::error::ShellError::Execution(e.to_string()))?
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_file(
    path: String,
    policy: State<'_, Arc<SecurityPolicy>>,
) -> Result<()> {
    let policy = Arc::clone(&policy);
    tokio::task::spawn_blocking(move || {
        let fs = FileSystem::new(policy);
        fs.delete_file(Path::new(&path))
    }).await.map_err(|e| crate::error::ShellError::Execution(e.to_string()))?
}

/// List directory contents
#[tauri::command]
pub async fn list_directory(
    path: String,
    policy: State<'_, Arc<SecurityPolicy>>,
) -> Result<DirectoryContents> {
    let policy = Arc::clone(&policy);
    tokio::task::spawn_blocking(move || {
        let fs = FileSystem::new(policy);
        fs.list_directory(Path::new(&path))
    }).await.map_err(|e| crate::error::ShellError::Execution(e.to_string()))?
}

/// Watch a directory for changes
#[tauri::command]
pub async fn watch_directory(
    path: String,
    policy: State<'_, Arc<SecurityPolicy>>,
) -> Result<()> {
    let policy = Arc::clone(&policy);
    tokio::task::spawn_blocking(move || {
        let fs = FileSystem::new(policy);
        fs.watch_directory(Path::new(&path))
    }).await.map_err(|e| crate::error::ShellError::Execution(e.to_string()))?
}

/// Create a directory (and parent directories if needed)
#[tauri::command]
pub async fn create_directory(path: String) -> Result<()> {
    tokio::task::spawn_blocking(move || {
        std::fs::create_dir_all(&path)
            .map_err(crate::error::ShellError::Filesystem)
    }).await.map_err(|e| crate::error::ShellError::Execution(e.to_string()))?
}
