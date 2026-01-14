//! Custom error types for Shell IDE

use thiserror::Error;

#[derive(Error, Debug)]
pub enum ShellError {
    #[error("Filesystem error: {0}")]
    Filesystem(#[from] std::io::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Docker error: {0}")]
    Docker(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Lesson error: {0}")]
    Lesson(String),

    #[error("Execution error: {0}")]
    Execution(String),

    #[error("Security error: {0}")]
    Security(String),

    #[error("Service error: {0}")]
    Service(String),

    #[error("Feature not available: {0}")]
    FeatureNotAvailable(String),

    #[error("Cloud required: {0}")]
    CloudRequired(String),

    #[error("Invalid configuration: {0}")]
    Configuration(String),
}

// Make errors serializable for Tauri
impl serde::Serialize for ShellError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, ShellError>;
