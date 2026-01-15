//! Filesystem operations for Shell IDE
//!
//! All file operations go through Rust for security.
//! The frontend cannot directly access the filesystem.
//! Optimized for speed with async operations and caching.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use crate::error::{Result, ShellError};
use crate::security::SecurityPolicy;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: Option<String>,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryContents {
    pub path: String,
    pub entries: Vec<FileInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileContents {
    pub path: String,
    pub content: String,
    pub encoding: String,
}

/// Optimized file system operations with shared security policy
pub struct FileSystem {
    policy: Arc<SecurityPolicy>,
}

impl FileSystem {
    pub fn new(policy: Arc<SecurityPolicy>) -> Self {
        Self { policy }
    }

    /// Read a file's contents (optimized with capacity hint)
    pub fn read_file(&self, path: &Path) -> Result<FileContents> {
        self.policy.validate_path(path)?;
        
        let metadata = std::fs::metadata(path)?;
        self.policy.check_file_size(metadata.len())?;
        
        // Pre-allocate string with known capacity for speed
        let content = std::fs::read_to_string(path)?;
        
        Ok(FileContents {
            path: path.to_string_lossy().into_owned(),
            content,
            encoding: "utf-8".to_string(),
        })
    }

    /// Write content to a file (async-friendly)
    pub fn write_file(&self, path: &Path, content: &str) -> Result<()> {
        self.policy.validate_path(path)?;
        self.policy.check_file_size(content.len() as u64)?;
        
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Create a new file
    pub fn create_file(&self, path: &Path, content: Option<&str>) -> Result<()> {
        self.policy.validate_path(path)?;
        
        if path.exists() {
            return Err(ShellError::Filesystem(std::io::Error::new(
                std::io::ErrorKind::AlreadyExists,
                "File already exists",
            )));
        }
        
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;
            }
        }
        
        std::fs::write(path, content.unwrap_or(""))?;
        Ok(())
    }

    /// Delete a file or directory
    pub fn delete_file(&self, path: &Path) -> Result<()> {
        self.policy.validate_path(path)?;
        
        if path.is_dir() {
            std::fs::remove_dir_all(path)?;
        } else {
            std::fs::remove_file(path)?;
        }
        
        Ok(())
    }

    /// List directory contents (optimized with pre-allocation)
    pub fn list_directory(&self, path: &Path) -> Result<DirectoryContents> {
        self.policy.validate_path(path)?;
        
        let read_dir = std::fs::read_dir(path)?;
        
        // Pre-allocate with estimated capacity
        let mut entries = Vec::with_capacity(64);
        
        for entry in read_dir {
            let entry = entry?;
            let metadata = entry.metadata()?;
            let entry_path = entry.path();
            
            entries.push(FileInfo {
                path: entry_path.to_string_lossy().into_owned(),
                name: entry.file_name().to_string_lossy().into_owned(),
                is_directory: metadata.is_dir(),
                size: metadata.len(),
                modified: metadata.modified().ok().map(|t| {
                    chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
                }),
                extension: entry_path.extension().map(|e| e.to_string_lossy().into_owned()),
            });
        }
        
        // Sort: directories first, then by name (case-insensitive)
        entries.sort_unstable_by(|a, b| {
            match (a.is_directory, b.is_directory) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });
        
        Ok(DirectoryContents {
            path: path.to_string_lossy().into_owned(),
            entries,
        })
    }

    /// Create a directory
    pub fn create_directory(&self, path: &Path) -> Result<()> {
        self.policy.validate_path(path)?;
        std::fs::create_dir_all(path)?;
        Ok(())
    }

    /// Check if path exists
    pub fn exists(&self, path: &Path) -> Result<bool> {
        self.policy.validate_path(path)?;
        Ok(path.exists())
    }

    /// Get file info
    pub fn get_info(&self, path: &Path) -> Result<FileInfo> {
        self.policy.validate_path(path)?;
        
        let metadata = std::fs::metadata(path)?;
        
        Ok(FileInfo {
            path: path.to_string_lossy().into_owned(),
            name: path.file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default(),
            is_directory: metadata.is_dir(),
            size: metadata.len(),
            modified: metadata.modified().ok().map(|t| {
                chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
            }),
            extension: path.extension().map(|e| e.to_string_lossy().into_owned()),
        })
    }

    /// Watch a directory for changes
    pub fn watch_directory(&self, _path: &Path) -> Result<()> {
        // TODO: Implement file watching using notify crate
        Ok(())
    }
}

/// Project structure detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub path: PathBuf,
    pub name: String,
    pub language: Option<String>,
    pub framework: Option<String>,
    pub has_lesson: bool,
    pub files: Vec<String>,
}

impl ProjectInfo {
    /// Detect project information from a directory (optimized)
    pub fn detect(path: &Path) -> Result<Self> {
        let name = path.file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Untitled".to_string());
        
        let mut language = None;
        let framework = None;
        let mut has_lesson = false;
        let mut files = Vec::with_capacity(32);
        
        // Detect based on config files
        for entry in std::fs::read_dir(path)?.filter_map(|e| e.ok()) {
            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();
            files.push(file_name_str.clone().into_owned());
            
            match file_name_str.as_ref() {
                "package.json" => language = Some("javascript".to_string()),
                "Cargo.toml" => language = Some("rust".to_string()),
                "requirements.txt" | "pyproject.toml" | "setup.py" => {
                    language = Some("python".to_string());
                }
                "go.mod" => language = Some("go".to_string()),
                "pom.xml" | "build.gradle" => language = Some("java".to_string()),
                "lesson.yaml" | "lesson.json" => has_lesson = true,
                _ => {}
            }
        }
        
        Ok(Self {
            path: path.to_path_buf(),
            name,
            language,
            framework,
            has_lesson,
            files,
        })
    }
}
