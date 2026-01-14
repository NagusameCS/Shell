//! Filesystem IPC commands

use tauri::State;
use crate::db::Database;
use crate::error::Result;
use crate::fs::{FileContents, DirectoryContents, ProjectInfo};
use crate::security::SecurityPolicy;
use std::path::Path;

/// Read a project directory and return its structure
#[tauri::command]
pub async fn read_project(path: String) -> Result<ProjectInfo> {
    let path = Path::new(&path);
    ProjectInfo::detect(path)
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<()> {
    let policy = SecurityPolicy::default();
    let fs = crate::fs::FileSystem::new(policy);
    fs.write_file(Path::new(&path), &content)
}

/// Create a new file
#[tauri::command]
pub async fn create_file(path: String, content: Option<String>) -> Result<()> {
    let policy = SecurityPolicy::default();
    let fs = crate::fs::FileSystem::new(policy);
    fs.create_file(Path::new(&path), content.as_deref())
}

/// Delete a file or directory
#[tauri::command]
pub async fn delete_file(path: String) -> Result<()> {
    let policy = SecurityPolicy::default();
    let fs = crate::fs::FileSystem::new(policy);
    fs.delete_file(Path::new(&path))
}

/// List directory contents
#[tauri::command]
pub async fn list_directory(path: String) -> Result<DirectoryContents> {
    let policy = SecurityPolicy::default();
    let fs = crate::fs::FileSystem::new(policy);
    fs.list_directory(Path::new(&path))
}

/// Watch a directory for changes
#[tauri::command]
pub async fn watch_directory(path: String) -> Result<()> {
    let policy = SecurityPolicy::default();
    let fs = crate::fs::FileSystem::new(policy);
    fs.watch_directory(Path::new(&path))
}

/// Create a directory (and parent directories if needed)
#[tauri::command]
pub async fn create_directory(path: String) -> Result<()> {
    std::fs::create_dir_all(&path)
        .map_err(|e| crate::error::ShellError::Filesystem(e))
}
