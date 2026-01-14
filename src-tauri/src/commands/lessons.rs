//! Lesson IPC commands

use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::error::{Result, ShellError};

/// Lesson metadata and content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lesson {
    pub id: String,
    pub version: String,
    pub title: String,
    pub description: String,
    pub author: Option<Author>,
    pub language: String,
    pub difficulty: Difficulty,
    pub tags: Vec<String>,
    pub prerequisites: Vec<String>,
    pub content: LessonContent,
    pub constraints: Option<Constraints>,
    pub grading: Option<GradingConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Author {
    pub name: String,
    pub email: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Difficulty {
    Beginner,
    Intermediate,
    Advanced,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LessonContent {
    /// Markdown explanation
    pub explanation: String,
    /// Starter code provided to student
    pub starter_code: Option<String>,
    /// Solution code (hidden from student)
    pub solution: Option<String>,
    /// IO diagram configuration
    pub io_diagram: Option<IoDiagram>,
    /// Hints (progressively revealed)
    pub hints: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoDiagram {
    pub inputs: Vec<IoExample>,
    pub outputs: Vec<IoExample>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoExample {
    pub label: String,
    pub value: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Constraints {
    /// Maximum execution time (ms)
    pub max_time_ms: Option<u64>,
    /// Maximum memory (bytes)
    pub max_memory_bytes: Option<u64>,
    /// Allowed imports/modules
    pub allowed_imports: Option<Vec<String>>,
    /// Disallowed imports/modules
    pub disallowed_imports: Option<Vec<String>>,
    /// Required functions/classes
    pub required_symbols: Option<Vec<String>>,
    /// Maximum lines of code
    pub max_lines: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradingConfig {
    /// Test cases for local testing
    pub local_tests: Vec<TestCase>,
    /// Hidden test cases (cloud grading only)
    pub hidden_tests: Option<Vec<TestCase>>,
    /// Rubric for manual/partial grading
    pub rubric: Option<Vec<RubricItem>>,
    /// Auto-grading configuration
    pub auto_grade: Option<AutoGradeConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCase {
    pub id: String,
    pub name: String,
    pub input: String,
    pub expected_output: String,
    pub points: f32,
    pub hidden: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RubricItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub points: f32,
    pub criteria: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoGradeConfig {
    pub enabled: bool,
    /// Docker image for grading
    pub image: Option<String>,
    /// Custom grading script
    pub script: Option<String>,
}

/// Load a lesson from file
#[tauri::command]
pub async fn load_lesson(path: String) -> Result<Lesson> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Err(ShellError::Lesson("Lesson file not found".into()));
    }
    
    let content = std::fs::read_to_string(path)?;
    
    // Support both YAML and JSON
    let lesson: Lesson = if path.extension().map(|e| e == "yaml" || e == "yml").unwrap_or(false) {
        serde_yaml::from_str(&content)
            .map_err(|e| ShellError::Lesson(format!("Invalid YAML: {}", e)))?
    } else {
        serde_json::from_str(&content)
            .map_err(|e| ShellError::Lesson(format!("Invalid JSON: {}", e)))?
    };
    
    Ok(lesson)
}

/// Save a lesson to file
#[tauri::command]
pub async fn save_lesson(path: String, lesson: Lesson) -> Result<()> {
    let path = Path::new(&path);
    
    let content = if path.extension().map(|e| e == "yaml" || e == "yml").unwrap_or(false) {
        serde_yaml::to_string(&lesson)
            .map_err(|e| ShellError::Lesson(format!("Failed to serialize: {}", e)))?
    } else {
        serde_json::to_string_pretty(&lesson)?
    };
    
    std::fs::write(path, content)?;
    Ok(())
}

/// List lessons in a directory
#[tauri::command]
pub async fn list_lessons(directory: String) -> Result<Vec<LessonSummary>> {
    let dir = Path::new(&directory);
    let mut lessons = Vec::new();
    
    if !dir.is_dir() {
        return Ok(lessons);
    }
    
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        
        // Check for lesson files
        if path.is_file() {
            let name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            
            if name.starts_with("lesson.") && 
               (name.ends_with(".yaml") || name.ends_with(".yml") || name.ends_with(".json")) {
                if let Ok(lesson) = load_lesson(path.to_string_lossy().to_string()).await {
                    lessons.push(LessonSummary {
                        id: lesson.id,
                        title: lesson.title,
                        description: lesson.description,
                        language: lesson.language,
                        difficulty: lesson.difficulty,
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }
    
    Ok(lessons)
}

/// Validate a lesson file
#[tauri::command]
pub async fn validate_lesson(path: String) -> Result<ValidationResult> {
    let result = load_lesson(path.clone()).await;
    
    match result {
        Ok(lesson) => {
            let mut warnings = Vec::new();
            
            // Check for common issues
            if lesson.content.explanation.is_empty() {
                warnings.push("Lesson has no explanation".to_string());
            }
            
            if lesson.grading.is_none() {
                warnings.push("Lesson has no grading configuration".to_string());
            } else if let Some(grading) = &lesson.grading {
                if grading.local_tests.is_empty() {
                    warnings.push("Lesson has no local tests".to_string());
                }
            }
            
            Ok(ValidationResult {
                valid: true,
                errors: vec![],
                warnings,
            })
        }
        Err(e) => {
            Ok(ValidationResult {
                valid: false,
                errors: vec![e.to_string()],
                warnings: vec![],
            })
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LessonSummary {
    pub id: String,
    pub title: String,
    pub description: String,
    pub language: String,
    pub difficulty: Difficulty,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
