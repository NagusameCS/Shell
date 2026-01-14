//! Grading IPC commands

use serde::{Deserialize, Serialize};
use tauri::State;
use crate::docker::{DockerManager, ExecutionRequest};
use crate::features::FeatureFlags;
use crate::error::{Result, ShellError};
use crate::commands::lessons::{TestCase, Lesson};

/// Test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestResult {
    pub id: String,
    pub name: String,
    pub passed: bool,
    pub actual_output: String,
    pub expected_output: String,
    pub points_earned: f32,
    pub points_possible: f32,
    pub execution_time_ms: u64,
    pub error: Option<String>,
}

/// Grading result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradingResult {
    pub submission_id: String,
    pub lesson_id: String,
    pub total_points: f32,
    pub max_points: f32,
    pub percentage: f32,
    pub test_results: Vec<TestResult>,
    pub feedback: Option<String>,
    pub graded_at: String,
    pub graded_by: GradingSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GradingSource {
    Local,
    Cloud,
}

/// Run local tests for a submission
#[tauri::command]
pub async fn run_local_tests(
    lesson_path: String,
    project_path: String,
    language: String,
    code: String,
    docker: State<'_, DockerManager>,
) -> Result<GradingResult> {
    // Load the lesson to get test cases
    let lesson = crate::commands::lessons::load_lesson(lesson_path).await?;
    
    let grading = lesson.grading
        .ok_or_else(|| ShellError::Lesson("Lesson has no grading configuration".into()))?;
    
    // Filter to visible tests only (local grading)
    let tests: Vec<_> = grading.local_tests.iter()
        .filter(|t| !t.hidden)
        .collect();
    
    if tests.is_empty() {
        return Err(ShellError::Lesson("No local tests available".into()));
    }
    
    let mut test_results = Vec::new();
    let mut total_points = 0.0;
    let max_points: f32 = tests.iter().map(|t| t.points).sum();
    
    // Run each test
    for test in tests {
        let result = run_single_test(
            test,
            &project_path,
            &language,
            &code,
            &docker,
        ).await;
        
        if result.passed {
            total_points += result.points_earned;
        }
        
        test_results.push(result);
    }
    
    let percentage = if max_points > 0.0 {
        (total_points / max_points) * 100.0
    } else {
        0.0
    };
    
    Ok(GradingResult {
        submission_id: uuid::Uuid::new_v4().to_string(),
        lesson_id: lesson.id,
        total_points,
        max_points,
        percentage,
        test_results,
        feedback: generate_feedback(percentage),
        graded_at: chrono::Utc::now().to_rfc3339(),
        graded_by: GradingSource::Local,
    })
}

/// Run a single test case
async fn run_single_test(
    test: &TestCase,
    project_path: &str,
    language: &str,
    _code: &str,
    docker: &State<'_, DockerManager>,
) -> TestResult {
    let start_time = std::time::Instant::now();
    
    // Get execution image and command
    let image = match crate::commands::execution::get_language_image(language) {
        Ok(img) => img,
        Err(e) => {
            return TestResult {
                id: test.id.clone(),
                name: test.name.clone(),
                passed: false,
                actual_output: String::new(),
                expected_output: test.expected_output.clone(),
                points_earned: 0.0,
                points_possible: test.points,
                execution_time_ms: 0,
                error: Some(e.to_string()),
            };
        }
    };
    
    // For now, return a placeholder result
    // TODO: Implement actual test execution with input/output comparison
    let execution_time_ms = start_time.elapsed().as_millis() as u64;
    
    TestResult {
        id: test.id.clone(),
        name: test.name.clone(),
        passed: false,
        actual_output: "Test execution pending".to_string(),
        expected_output: test.expected_output.clone(),
        points_earned: 0.0,
        points_possible: test.points,
        execution_time_ms,
        error: Some("Test execution not yet implemented".to_string()),
    }
}

/// Generate feedback based on score
fn generate_feedback(percentage: f32) -> Option<String> {
    let feedback = if percentage >= 100.0 {
        "Perfect score! Excellent work!"
    } else if percentage >= 80.0 {
        "Great job! You've demonstrated a strong understanding."
    } else if percentage >= 60.0 {
        "Good effort. Review the failing tests and try again."
    } else if percentage >= 40.0 {
        "You're making progress. Check your approach and review the hints."
    } else {
        "Keep practicing. Make sure you understand the problem before coding."
    };
    
    Some(feedback.to_string())
}

/// Cloud grading request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudGradingRequest {
    pub lesson_id: String,
    pub code: String,
    pub language: String,
    pub project_files: Vec<ProjectFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectFile {
    pub path: String,
    pub content: String,
}

/// Submit for cloud grading
#[tauri::command]
pub async fn submit_for_grading(
    request: CloudGradingRequest,
    features: State<'_, std::sync::RwLock<FeatureFlags>>,
) -> Result<GradingResult> {
    // Check if cloud grading is available
    let flags = features.read()
        .map_err(|_| ShellError::Security("Failed to read feature flags".into()))?;
    
    if !flags.cloud_grading {
        return Err(ShellError::CloudRequired(
            "Cloud grading requires a teacher license. Your code was tested locally only.".into()
        ));
    }
    
    // TODO: Implement actual cloud API call
    Err(ShellError::CloudRequired(
        "Cloud grading service not yet implemented. Local testing is available.".into()
    ))
}

// Helper function - make it public for use in execution module
pub fn get_language_image(language: &str) -> Result<String> {
    crate::commands::execution::get_language_image(language)
}
