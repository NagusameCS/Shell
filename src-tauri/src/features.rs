//! Feature flags for Shell IDE
//!
//! All differences between Student and Teacher editions are controlled
//! via feature flags. There is NO code fork between editions.

use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::RwLock;

/// Feature flags that control available functionality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFlags {
    /// Teacher mode enabled (requires valid license)
    pub teacher_mode: bool,

    /// Cloud sync enabled
    pub cloud_sync: bool,

    /// Classroom features
    pub classrooms: bool,

    /// Auto-grading via cloud
    pub cloud_grading: bool,

    /// Analytics dashboard
    pub analytics: bool,

    /// Secure exam mode
    pub exam_mode: bool,

    /// Plagiarism detection
    pub plagiarism_detection: bool,

    /// Marketplace access (always available, purchasing requires account)
    pub marketplace: bool,

    /// License information
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<License>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct License {
    pub license_type: LicenseType,
    pub valid_until: Option<chrono::DateTime<chrono::Utc>>,
    pub seats: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LicenseType {
    /// Free student edition
    Student,
    /// Individual teacher
    TeacherIndividual,
    /// School/institution license
    TeacherInstitution,
    /// Self-hosted enterprise
    Enterprise,
}

impl Default for FeatureFlags {
    fn default() -> Self {
        Self {
            // Student edition defaults - all core features available
            teacher_mode: false,
            cloud_sync: false,
            classrooms: false,
            cloud_grading: false,
            analytics: false,
            exam_mode: false,
            plagiarism_detection: false,
            marketplace: true, // Browsing always available
            license: Some(License {
                license_type: LicenseType::Student,
                valid_until: None,
                seats: None,
            }),
        }
    }
}

impl FeatureFlags {
    /// Load feature flags from app data directory
    pub fn load(app_data: &Path) -> Self {
        let flags_path = app_data.join("features.json");
        
        if flags_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&flags_path) {
                if let Ok(flags) = serde_json::from_str(&content) {
                    return flags;
                }
            }
        }

        Self::default()
    }

    /// Save feature flags to app data directory
    pub fn save(&self, app_data: &Path) -> std::io::Result<()> {
        let flags_path = app_data.join("features.json");
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(flags_path, content)
    }

    /// Check if a specific cloud feature is available
    pub fn requires_cloud(&self, feature: &str) -> bool {
        matches!(
            feature,
            "cloud_sync" | "cloud_grading" | "analytics" | "classrooms"
        )
    }

    /// Upgrade to teacher mode with license
    pub fn activate_teacher(&mut self, license: License) {
        self.license = Some(license.clone());
        
        match license.license_type {
            LicenseType::Student => {
                // No changes
            }
            LicenseType::TeacherIndividual => {
                self.teacher_mode = true;
                self.cloud_sync = true;
                self.classrooms = true;
                self.cloud_grading = true;
                self.analytics = true;
            }
            LicenseType::TeacherInstitution | LicenseType::Enterprise => {
                self.teacher_mode = true;
                self.cloud_sync = true;
                self.classrooms = true;
                self.cloud_grading = true;
                self.analytics = true;
                self.exam_mode = true;
                self.plagiarism_detection = true;
            }
        }
    }
}

/// Thread-safe wrapper for feature flags
pub struct FeatureFlagsState(pub RwLock<FeatureFlags>);

impl FeatureFlagsState {
    pub fn new(flags: FeatureFlags) -> Self {
        Self(RwLock::new(flags))
    }
}

impl From<FeatureFlags> for FeatureFlagsState {
    fn from(flags: FeatureFlags) -> Self {
        Self::new(flags)
    }
}
