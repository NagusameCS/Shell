//! Database module for Shell IDE
//!
//! Uses SQLite for local metadata storage.
//! No account required - everything works locally.

use rusqlite::{Connection, params};
use std::path::Path;
use std::sync::Mutex;
use crate::error::{Result, ShellError};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Initialize the database
    pub fn init(app_data: &Path) -> Result<Self> {
        let db_path = app_data.join("shell.db");
        let conn = Connection::open(&db_path)?;

        // Create tables
        conn.execute_batch(
            r#"
            -- Projects metadata
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                language TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                settings TEXT
            );

            -- Lessons (local copies)
            CREATE TABLE IF NOT EXISTS lessons (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                path TEXT NOT NULL,
                version TEXT NOT NULL,
                author TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                metadata TEXT
            );

            -- Submissions (local history)
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                lesson_id TEXT,
                project_id TEXT,
                submitted_at TEXT NOT NULL,
                status TEXT NOT NULL,
                score REAL,
                feedback TEXT,
                FOREIGN KEY (lesson_id) REFERENCES lessons(id),
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- Execution history
            CREATE TABLE IF NOT EXISTS executions (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                status TEXT NOT NULL,
                output TEXT,
                exit_code INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- User settings
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- LSP configurations
            CREATE TABLE IF NOT EXISTS lsp_configs (
                language TEXT PRIMARY KEY,
                server_path TEXT NOT NULL,
                args TEXT,
                settings TEXT
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
            CREATE INDEX IF NOT EXISTS idx_lessons_path ON lessons(path);
            CREATE INDEX IF NOT EXISTS idx_executions_project ON executions(project_id);
            "#,
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Get a setting value
    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().map_err(|e| ShellError::Database(
            rusqlite::Error::InvalidQuery
        ))?;
        
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?")?;
        let result = stmt.query_row(params![key], |row| row.get(0));
        
        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Set a setting value
    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().map_err(|e| ShellError::Database(
            rusqlite::Error::InvalidQuery
        ))?;
        
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            params![key, value],
        )?;
        
        Ok(())
    }

    /// Register a project
    pub fn register_project(&self, id: &str, name: &str, path: &str, language: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().map_err(|e| ShellError::Database(
            rusqlite::Error::InvalidQuery
        ))?;
        
        let now = chrono::Utc::now().to_rfc3339();
        
        conn.execute(
            r#"INSERT OR REPLACE INTO projects 
               (id, name, path, language, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?)"#,
            params![id, name, path, language, now, now],
        )?;
        
        Ok(())
    }

    /// List all projects
    pub fn list_projects(&self) -> Result<Vec<Project>> {
        let conn = self.conn.lock().map_err(|e| ShellError::Database(
            rusqlite::Error::InvalidQuery
        ))?;
        
        let mut stmt = conn.prepare(
            "SELECT id, name, path, language, created_at, updated_at FROM projects ORDER BY updated_at DESC"
        )?;
        
        let projects = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                language: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        
        projects.collect::<std::result::Result<Vec<_>, _>>().map_err(Into::into)
    }

    /// Save LSP configuration
    pub fn save_lsp_config(&self, language: &str, server_path: &str, args: Option<&str>, settings: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().map_err(|e| ShellError::Database(
            rusqlite::Error::InvalidQuery
        ))?;
        
        conn.execute(
            "INSERT OR REPLACE INTO lsp_configs (language, server_path, args, settings) VALUES (?, ?, ?, ?)",
            params![language, server_path, args, settings],
        )?;
        
        Ok(())
    }

    /// Get LSP configuration for a language
    pub fn get_lsp_config(&self, language: &str) -> Result<Option<LspConfig>> {
        let conn = self.conn.lock().map_err(|e| ShellError::Database(
            rusqlite::Error::InvalidQuery
        ))?;
        
        let mut stmt = conn.prepare(
            "SELECT language, server_path, args, settings FROM lsp_configs WHERE language = ?"
        )?;
        
        let result = stmt.query_row(params![language], |row| {
            Ok(LspConfig {
                language: row.get(0)?,
                server_path: row.get(1)?,
                args: row.get(2)?,
                settings: row.get(3)?,
            })
        });
        
        match result {
            Ok(config) => Ok(Some(config)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: String,
    pub language: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LspConfig {
    pub language: String,
    pub server_path: String,
    pub args: Option<String>,
    pub settings: Option<String>,
}
