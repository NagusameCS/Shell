//! Settings IPC commands

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::Database;
use crate::error::Result;

/// User settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub theme: String,
    pub font_size: u32,
    pub font_family: String,
    pub tab_size: u32,
    pub auto_save: bool,
    pub auto_save_delay_ms: u32,
    pub show_minimap: bool,
    pub word_wrap: bool,
    pub line_numbers: bool,
    pub bracket_matching: bool,
    pub auto_indent: bool,
    pub format_on_save: bool,
    pub default_language: Option<String>,
    pub docker_enabled: bool,
    pub execution_timeout: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "shell-dark".to_string(),
            font_size: 14,
            font_family: "JetBrains Mono, Consolas, monospace".to_string(),
            tab_size: 4,
            auto_save: true,
            auto_save_delay_ms: 1000,
            show_minimap: true,
            word_wrap: false,
            line_numbers: true,
            bracket_matching: true,
            auto_indent: true,
            format_on_save: false,
            default_language: None,
            docker_enabled: true,
            execution_timeout: 30,
        }
    }
}

/// Get user settings
#[tauri::command]
pub async fn get_settings(db: State<'_, Database>) -> Result<Settings> {
    if let Ok(Some(json)) = db.get_setting("settings") {
        if let Ok(settings) = serde_json::from_str(&json) {
            return Ok(settings);
        }
    }
    
    Ok(Settings::default())
}

/// Update user settings
#[tauri::command]
pub async fn update_settings(settings: Settings, db: State<'_, Database>) -> Result<()> {
    let json = serde_json::to_string(&settings)?;
    db.set_setting("settings", &json)?;
    Ok(())
}
