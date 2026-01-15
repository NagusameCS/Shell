//! Security module for Shell IDE
//!
//! Implements security boundaries for:
//! - File system access
//! - Process execution
//! - Network access
//! - Plugin sandboxing

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use crate::error::{Result, ShellError};

/// Security policy for Shell IDE
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPolicy {
    /// Allowed base paths for file operations
    pub allowed_paths: Vec<PathBuf>,
    
    /// Denied paths (takes precedence over allowed)
    pub denied_paths: Vec<PathBuf>,
    
    /// File extensions that can be executed
    pub executable_extensions: HashSet<String>,
    
    /// Maximum file size for operations (bytes)
    pub max_file_size: u64,
    
    /// Maximum number of files in a project
    pub max_files_per_project: u32,
    
    /// Network access policy
    pub network_policy: NetworkPolicy,
    
    /// Plugin execution policy
    pub plugin_policy: PluginPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkPolicy {
    /// Allow network access (default: false for execution)
    pub allow_network: bool,
    
    /// Allowed hosts (if network enabled)
    pub allowed_hosts: Vec<String>,
    
    /// Blocked hosts (takes precedence)
    pub blocked_hosts: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPolicy {
    /// Allow plugins
    pub allow_plugins: bool,
    
    /// Require plugin signatures
    pub require_signatures: bool,
    
    /// Trusted plugin publishers
    pub trusted_publishers: Vec<String>,
}

impl Default for SecurityPolicy {
    fn default() -> Self {
        Self {
            allowed_paths: vec![
                // Home directory (user's personal files)
                dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")),
                // Also explicitly allow common project directories
                dirs::document_dir().unwrap_or_else(|| PathBuf::from(".")),
                dirs::desktop_dir().unwrap_or_else(|| PathBuf::from(".")),
                dirs::download_dir().unwrap_or_else(|| PathBuf::from(".")),
            ],
            denied_paths: vec![
                PathBuf::from("/etc"),
                PathBuf::from("/usr"),
                PathBuf::from("/bin"),
                PathBuf::from("/sbin"),
                PathBuf::from("/System"),
                PathBuf::from("/Library"),
            ],
            executable_extensions: ["py", "js", "ts", "rb", "go", "rs", "java", "c", "cpp", "sh"]
                .iter().map(|s| s.to_string()).collect(),
            max_file_size: 10 * 1024 * 1024, // 10MB
            max_files_per_project: 10_000,
            network_policy: NetworkPolicy {
                allow_network: false,
                allowed_hosts: vec![],
                blocked_hosts: vec![],
            },
            plugin_policy: PluginPolicy {
                allow_plugins: true,
                require_signatures: false, // Relaxed for development
                trusted_publishers: vec!["shell.dev".to_string()],
            },
        }
    }
}

impl SecurityPolicy {
    /// Check if a path is allowed for file operations
    pub fn is_path_allowed(&self, path: &Path) -> bool {
        let path = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
        
        // Check denied paths first
        for denied in &self.denied_paths {
            if path.starts_with(denied) {
                return false;
            }
        }
        
        // Check allowed paths
        for allowed in &self.allowed_paths {
            if path.starts_with(allowed) {
                return true;
            }
        }
        
        false
    }
    
    /// Validate a path and return an error if not allowed
    pub fn validate_path(&self, path: &Path) -> Result<()> {
        if !self.is_path_allowed(path) {
            return Err(ShellError::Security(format!(
                "Access denied: {}",
                path.display()
            )));
        }
        Ok(())
    }
    
    /// Check if a file can be executed
    pub fn can_execute(&self, path: &Path) -> bool {
        if !self.is_path_allowed(path) {
            return false;
        }
        
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| self.executable_extensions.contains(ext))
            .unwrap_or(false)
    }
    
    /// Check file size limit
    pub fn check_file_size(&self, size: u64) -> Result<()> {
        if size > self.max_file_size {
            return Err(ShellError::Security(format!(
                "File too large: {} bytes (max: {} bytes)",
                size, self.max_file_size
            )));
        }
        Ok(())
    }
}

/// Path sanitizer for preventing directory traversal attacks
pub struct PathSanitizer;

impl PathSanitizer {
    /// Sanitize a path to prevent directory traversal
    pub fn sanitize(base: &Path, relative: &str) -> Result<PathBuf> {
        // Remove any leading slashes and normalize
        let cleaned = relative
            .trim_start_matches('/')
            .trim_start_matches('\\')
            .replace("..", "");
        
        let full_path = base.join(&cleaned);
        let canonical = full_path.canonicalize()
            .map_err(|_| ShellError::Security("Invalid path".into()))?;
        
        // Verify the resolved path is still under base
        let base_canonical = base.canonicalize()
            .map_err(|_| ShellError::Security("Invalid base path".into()))?;
        
        if !canonical.starts_with(&base_canonical) {
            return Err(ShellError::Security("Path traversal detected".into()));
        }
        
        Ok(canonical)
    }
}

/// Secure random string generation
pub fn generate_secure_id() -> String {
    use ring::rand::{SecureRandom, SystemRandom};
    
    let rng = SystemRandom::new();
    let mut bytes = [0u8; 16];
    rng.fill(&mut bytes).expect("Failed to generate random bytes");
    
    base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_path_security() {
        let policy = SecurityPolicy::default();
        
        // These should be denied
        assert!(!policy.is_path_allowed(Path::new("/etc/passwd")));
        assert!(!policy.is_path_allowed(Path::new("/usr/bin/sh")));
        
        // Executable extensions
        assert!(policy.executable_extensions.contains("py"));
        assert!(policy.executable_extensions.contains("js"));
    }
}
