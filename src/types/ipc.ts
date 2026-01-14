/**
 * IPC Types - Contracts between Rust and TypeScript
 *
 * These types define the communication boundary.
 * Any changes here must be synchronized with src-tauri/src/commands/*.rs
 */

// ============================================
// Filesystem Types
// ============================================

export interface FileInfo {
  path: string;
  name: string;
  is_directory: boolean;
  size: number;
  modified: string | null;
  extension: string | null;
}

export interface DirectoryContents {
  path: string;
  entries: FileInfo[];
}

export interface FileContents {
  path: string;
  content: string;
  encoding: string;
}

export interface ProjectInfo {
  path: string;
  name: string;
  language: string | null;
  framework: string | null;
  has_lesson: boolean;
  files: string[];
}

// ============================================
// Lesson Types
// ============================================

export interface Author {
  name: string;
  email?: string;
  url?: string;
}

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface IoExample {
  label: string;
  value: string;
  description?: string;
}

export interface IoDiagram {
  inputs: IoExample[];
  outputs: IoExample[];
}

export interface LessonContent {
  explanation: string;
  starter_code?: string;
  solution?: string;
  io_diagram?: IoDiagram;
  hints: string[];
}

export interface Constraints {
  max_time_ms?: number;
  max_memory_bytes?: number;
  allowed_imports?: string[];
  disallowed_imports?: string[];
  required_symbols?: string[];
  max_lines?: number;
}

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expected_output: string;
  points: number;
  hidden: boolean;
}

export interface RubricItem {
  id: string;
  name: string;
  description: string;
  points: number;
  criteria: string[];
}

export interface AutoGradeConfig {
  enabled: boolean;
  image?: string;
  script?: string;
}

export interface GradingConfig {
  local_tests: TestCase[];
  hidden_tests?: TestCase[];
  rubric?: RubricItem[];
  auto_grade?: AutoGradeConfig;
}

export interface Lesson {
  id: string;
  version: string;
  title: string;
  description: string;
  author?: Author;
  language: string;
  difficulty: Difficulty;
  tags: string[];
  prerequisites: string[];
  content: LessonContent;
  constraints?: Constraints;
  grading?: GradingConfig;
}

export interface LessonSummary {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: Difficulty;
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// Execution Types
// ============================================

export interface RunCodeRequest {
  language: string;
  code: string;
  project_path: string;
  entry_point?: string;
  stdin?: string;
  env?: Record<string, string>;
  step_mode?: boolean;
  trace_io?: boolean;
  timeout?: number;
}

export interface IoEvent {
  timestamp_ms: number;
  stream: "stdin" | "stdout" | "stderr";
  data: string;
}

export interface ExecutionStep {
  timestamp_ms: number;
  event_type: string;
  data: unknown;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  io_events: IoEvent[];
}

export interface ExecutionResult {
  id: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timed_out: boolean;
  trace?: ExecutionTrace;
}

export type ContainerStatus =
  | "Starting"
  | "Running"
  | "Completed"
  | "TimedOut"
  | "Failed";

export interface ContainerInfo {
  id: string;
  execution_id: string;
  started_at: string;
  status: ContainerStatus;
}

export interface ExecutionStatus {
  running: boolean;
  containers: ContainerInfo[];
}

// ============================================
// LSP Types
// ============================================

export interface LspServerInfo {
  language: string;
  name: string;
  command: string;
  args: string[];
  installed: boolean;
  installation_instructions?: string;
}

// ============================================
// Grading Types
// ============================================

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  actual_output: string;
  expected_output: string;
  points_earned: number;
  points_possible: number;
  execution_time_ms: number;
  error?: string;
}

export type GradingSource = "Local" | "Cloud";

export interface GradingResult {
  submission_id: string;
  lesson_id: string;
  total_points: number;
  max_points: number;
  percentage: number;
  test_results: TestResult[];
  feedback?: string;
  graded_at: string;
  graded_by: GradingSource;
}

export interface CloudGradingRequest {
  lesson_id: string;
  code: string;
  language: string;
  project_files: { path: string; content: string }[];
}

// ============================================
// Feature Flags
// ============================================

export type LicenseType =
  | "Student"
  | "TeacherIndividual"
  | "TeacherInstitution"
  | "Enterprise";

export interface License {
  license_type: LicenseType;
  valid_until?: string;
  seats?: number;
}

export interface FeatureFlags {
  teacher_mode: boolean;
  cloud_sync: boolean;
  classrooms: boolean;
  cloud_grading: boolean;
  analytics: boolean;
  exam_mode: boolean;
  plagiarism_detection: boolean;
  marketplace: boolean;
  license?: License;
}

// ============================================
// Settings Types
// ============================================

export interface Settings {
  theme: string;
  font_size: number;
  font_family: string;
  tab_size: number;
  auto_save: boolean;
  auto_save_delay_ms: number;
  show_minimap: boolean;
  word_wrap: boolean;
  line_numbers: boolean;
  bracket_matching: boolean;
  auto_indent: boolean;
  format_on_save: boolean;
  default_language?: string;
  docker_enabled: boolean;
  execution_timeout: number;
}
