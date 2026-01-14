//! Shell IDE - Education-first, local-first IDE
//!
//! This is the main entry point for the Tauri application.
//! Rust owns:
//! - Filesystem access
//! - Process spawning
//! - Docker orchestration
//! - Security boundaries
//! - SQLite metadata

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod docker;
mod error;
mod features;
mod fs;
mod security;
mod services;

use tauri::Manager;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "shell_ide=debug,tauri=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting Shell IDE");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Initialize database
            let app_data = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data)?;
            
            let db = db::Database::init(&app_data)?;
            app.manage(db);

            // Initialize feature flags
            let features = features::FeatureFlags::load(&app_data);
            app.manage(features);

            // Initialize Docker manager
            let docker = docker::DockerManager::new();
            app.manage(docker);

            // Initialize services manager
            let services = services::ServiceManager::new();
            app.manage(services);

            info!("Shell IDE initialized successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Filesystem commands
            commands::fs::read_project,
            commands::fs::write_file,
            commands::fs::create_file,
            commands::fs::delete_file,
            commands::fs::list_directory,
            commands::fs::watch_directory,
            commands::fs::create_directory,
            // Lesson commands
            commands::lessons::load_lesson,
            commands::lessons::save_lesson,
            commands::lessons::list_lessons,
            commands::lessons::validate_lesson,
            // Execution commands
            commands::execution::run_code,
            commands::execution::stop_execution,
            commands::execution::get_execution_status,
            // LSP commands
            commands::lsp::start_language_server,
            commands::lsp::stop_language_server,
            commands::lsp::get_available_servers,
            // Grading commands
            commands::grading::run_local_tests,
            commands::grading::submit_for_grading,
            // Feature flags
            commands::features::get_feature_flags,
            commands::features::is_teacher_mode,
            // Settings
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running shell ide");
}
