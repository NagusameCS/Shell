/**
 * Tauri IPC API wrapper
 *
 * All communication with Rust goes through here.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ProjectInfo,
  DirectoryContents,
  Lesson,
  LessonSummary,
  ValidationResult,
  RunCodeRequest,
  ExecutionResult,
  ExecutionStatus,
  LspServerInfo,
  GradingResult,
  CloudGradingRequest,
  FeatureFlags,
  Settings,
} from "@/types/ipc";

// ============================================
// Filesystem Commands
// ============================================

export async function readProject(path: string): Promise<ProjectInfo> {
  return invoke("read_project", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke("write_file", { path, content });
}

export async function createFile(
  path: string,
  content?: string
): Promise<void> {
  return invoke("create_file", { path, content });
}

export async function deleteFile(path: string): Promise<void> {
  return invoke("delete_file", { path });
}

export async function listDirectory(path: string): Promise<DirectoryContents> {
  return invoke("list_directory", { path });
}

export async function watchDirectory(path: string): Promise<void> {
  return invoke("watch_directory", { path });
}

// ============================================
// Lesson Commands
// ============================================

export async function loadLesson(path: string): Promise<Lesson> {
  return invoke("load_lesson", { path });
}

export async function saveLesson(path: string, lesson: Lesson): Promise<void> {
  return invoke("save_lesson", { path, lesson });
}

export async function listLessons(directory: string): Promise<LessonSummary[]> {
  return invoke("list_lessons", { directory });
}

export async function validateLesson(path: string): Promise<ValidationResult> {
  return invoke("validate_lesson", { path });
}

// ============================================
// Execution Commands
// ============================================

export async function runCode(
  request: RunCodeRequest
): Promise<ExecutionResult> {
  return invoke("run_code", { request });
}

export async function stopExecution(executionId: string): Promise<void> {
  return invoke("stop_execution", { executionId });
}

export async function getExecutionStatus(): Promise<ExecutionStatus> {
  return invoke("get_execution_status");
}

// ============================================
// LSP Commands
// ============================================

export async function startLanguageServer(
  language: string,
  projectPath: string
): Promise<string> {
  return invoke("start_language_server", { language, projectPath });
}

export async function stopLanguageServer(language: string): Promise<void> {
  return invoke("stop_language_server", { language });
}

export async function getAvailableServers(): Promise<LspServerInfo[]> {
  return invoke("get_available_servers");
}

// ============================================
// Grading Commands
// ============================================

export async function runLocalTests(
  lessonPath: string,
  projectPath: string,
  language: string,
  code: string
): Promise<GradingResult> {
  return invoke("run_local_tests", {
    lessonPath,
    projectPath,
    language,
    code,
  });
}

export async function submitForGrading(
  request: CloudGradingRequest
): Promise<GradingResult> {
  return invoke("submit_for_grading", { request });
}

// ============================================
// Feature Flags Commands
// ============================================

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return invoke("get_feature_flags");
}

export async function isEducatorMode(): Promise<boolean> {
  return invoke("is_educator_mode");
}

// ============================================
// Settings Commands
// ============================================

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { settings });
}
