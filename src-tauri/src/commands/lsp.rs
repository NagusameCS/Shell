//! LSP IPC commands

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::Database;
use crate::services::{ServiceManager, ServiceConfig, ServiceType};
use crate::error::{Result, ShellError};

/// Available LSP server information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LspServerInfo {
    pub language: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub installed: bool,
    pub installation_instructions: Option<String>,
}

/// Well-known LSP servers
fn get_known_servers() -> Vec<LspServerInfo> {
    vec![
        LspServerInfo {
            language: "python".to_string(),
            name: "Pylsp".to_string(),
            command: "pylsp".to_string(),
            args: vec![],
            installed: false,
            installation_instructions: Some("pip install python-lsp-server".to_string()),
        },
        LspServerInfo {
            language: "python".to_string(),
            name: "Pyright".to_string(),
            command: "pyright-langserver".to_string(),
            args: vec!["--stdio".to_string()],
            installed: false,
            installation_instructions: Some("npm install -g pyright".to_string()),
        },
        LspServerInfo {
            language: "javascript".to_string(),
            name: "TypeScript Language Server".to_string(),
            command: "typescript-language-server".to_string(),
            args: vec!["--stdio".to_string()],
            installed: false,
            installation_instructions: Some("npm install -g typescript-language-server typescript".to_string()),
        },
        LspServerInfo {
            language: "typescript".to_string(),
            name: "TypeScript Language Server".to_string(),
            command: "typescript-language-server".to_string(),
            args: vec!["--stdio".to_string()],
            installed: false,
            installation_instructions: Some("npm install -g typescript-language-server typescript".to_string()),
        },
        LspServerInfo {
            language: "rust".to_string(),
            name: "rust-analyzer".to_string(),
            command: "rust-analyzer".to_string(),
            args: vec![],
            installed: false,
            installation_instructions: Some("rustup component add rust-analyzer".to_string()),
        },
        LspServerInfo {
            language: "go".to_string(),
            name: "gopls".to_string(),
            command: "gopls".to_string(),
            args: vec![],
            installed: false,
            installation_instructions: Some("go install golang.org/x/tools/gopls@latest".to_string()),
        },
        LspServerInfo {
            language: "java".to_string(),
            name: "Eclipse JDT LS".to_string(),
            command: "jdtls".to_string(),
            args: vec![],
            installed: false,
            installation_instructions: Some("See https://github.com/eclipse/eclipse.jdt.ls".to_string()),
        },
        LspServerInfo {
            language: "c".to_string(),
            name: "clangd".to_string(),
            command: "clangd".to_string(),
            args: vec![],
            installed: false,
            installation_instructions: Some("Install LLVM/Clang".to_string()),
        },
        LspServerInfo {
            language: "cpp".to_string(),
            name: "clangd".to_string(),
            command: "clangd".to_string(),
            args: vec![],
            installed: false,
            installation_instructions: Some("Install LLVM/Clang".to_string()),
        },
        LspServerInfo {
            language: "ruby".to_string(),
            name: "Solargraph".to_string(),
            command: "solargraph".to_string(),
            args: vec!["stdio".to_string()],
            installed: false,
            installation_instructions: Some("gem install solargraph".to_string()),
        },
        LspServerInfo {
            language: "html".to_string(),
            name: "vscode-html-language-server".to_string(),
            command: "vscode-html-language-server".to_string(),
            args: vec!["--stdio".to_string()],
            installed: false,
            installation_instructions: Some("npm install -g vscode-langservers-extracted".to_string()),
        },
        LspServerInfo {
            language: "css".to_string(),
            name: "vscode-css-language-server".to_string(),
            command: "vscode-css-language-server".to_string(),
            args: vec!["--stdio".to_string()],
            installed: false,
            installation_instructions: Some("npm install -g vscode-langservers-extracted".to_string()),
        },
        LspServerInfo {
            language: "json".to_string(),
            name: "vscode-json-language-server".to_string(),
            command: "vscode-json-language-server".to_string(),
            args: vec!["--stdio".to_string()],
            installed: false,
            installation_instructions: Some("npm install -g vscode-langservers-extracted".to_string()),
        },
    ]
}

/// Check if a command exists in PATH
fn command_exists(command: &str) -> bool {
    std::process::Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// Start a language server
#[tauri::command]
pub async fn start_language_server(
    language: String,
    project_path: String,
    services: State<'_, ServiceManager>,
    db: State<'_, Database>,
) -> Result<String> {
    // Check if we have a custom config
    if let Ok(Some(config)) = db.get_lsp_config(&language) {
        let service_id = format!("lsp-{}", language);
        
        let service_config = ServiceConfig {
            id: service_id.clone(),
            service_type: ServiceType::Lsp(language.clone()),
            command: config.server_path,
            args: config.args.map(|a| serde_json::from_str(&a).unwrap_or_default()).unwrap_or_default(),
            working_dir: Some(std::path::PathBuf::from(&project_path)),
            env: std::collections::HashMap::new(),
        };
        
        services.register(service_config).await;
        services.start(&service_id).await?;
        
        return Ok(service_id);
    }
    
    // Find a known server for this language
    let servers = get_known_servers();
    let server = servers.iter()
        .find(|s| s.language == language && command_exists(&s.command))
        .or_else(|| servers.iter().find(|s| s.language == language))
        .ok_or_else(|| ShellError::Service(format!("No LSP server found for: {}", language)))?;
    
    if !command_exists(&server.command) {
        return Err(ShellError::Service(format!(
            "LSP server '{}' not installed. {}",
            server.name,
            server.installation_instructions.as_deref().unwrap_or("Please install it manually.")
        )));
    }
    
    let service_id = format!("lsp-{}", language);
    
    let service_config = ServiceConfig {
        id: service_id.clone(),
        service_type: ServiceType::Lsp(language),
        command: server.command.clone(),
        args: server.args.clone(),
        working_dir: Some(std::path::PathBuf::from(&project_path)),
        env: std::collections::HashMap::new(),
    };
    
    services.register(service_config).await;
    services.start(&service_id).await?;
    
    Ok(service_id)
}

/// Stop a language server
#[tauri::command]
pub async fn stop_language_server(
    language: String,
    services: State<'_, ServiceManager>,
) -> Result<()> {
    let service_id = format!("lsp-{}", language);
    services.stop(&service_id).await
}

/// Get available language servers
#[tauri::command]
pub async fn get_available_servers() -> Result<Vec<LspServerInfo>> {
    let mut servers = get_known_servers();
    
    // Check which servers are installed
    for server in &mut servers {
        server.installed = command_exists(&server.command);
    }
    
    Ok(servers)
}
