//! Feature flags IPC commands

use tauri::State;
use std::sync::RwLock;
use crate::features::FeatureFlags;
use crate::error::Result;

/// Get current feature flags
#[tauri::command]
pub async fn get_feature_flags(
    features: State<'_, RwLock<FeatureFlags>>,
) -> Result<FeatureFlags> {
    let flags = features.read()
        .map_err(|_| crate::error::ShellError::Security("Failed to read feature flags".into()))?;
    Ok(flags.clone())
}

/// Check if teacher mode is enabled
#[tauri::command]
pub async fn is_teacher_mode(
    features: State<'_, RwLock<FeatureFlags>>,
) -> Result<bool> {
    let flags = features.read()
        .map_err(|_| crate::error::ShellError::Security("Failed to read feature flags".into()))?;
    Ok(flags.teacher_mode)
}
