# Shell Grading API Specification

**Version:** 1.0.0  
**License:** MIT (specification only; cloud implementation is proprietary)  
**Status:** Draft

---

## Overview

The Shell Grading API enables automated evaluation of student code submissions. It consists of:

1. **Local Grading** - Runs entirely on the student's machine (MIT licensed)
2. **Cloud Grading** - Optional, hosted service for hidden tests and plagiarism detection (proprietary)

## Design Principles

1. **Graceful Degradation** - Cloud unavailability must not block learning
2. **Transparency** - Students know what requires cloud
3. **Determinism** - Same input produces same output
4. **Security** - Sandboxed execution, no network access during grading

---

## Local Grading

Local grading runs visible test cases on the student's machine using Docker containers.

### Request

```typescript
interface LocalGradingRequest {
  // Lesson being graded
  lesson_id: string;
  lesson_path: string;
  
  // Student's submission
  code: string;
  language: string;
  project_path: string;
  
  // Optional configuration
  timeout_ms?: number;
  memory_limit_bytes?: number;
}
```

### Response

```typescript
interface GradingResult {
  // Identification
  submission_id: string;
  lesson_id: string;
  
  // Scores
  total_points: number;
  max_points: number;
  percentage: number;
  
  // Test results
  test_results: TestResult[];
  
  // Feedback
  feedback?: string;
  
  // Metadata
  graded_at: string;  // ISO 8601
  graded_by: "Local" | "Cloud";
}

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  
  // Output comparison (only for non-hidden tests)
  actual_output: string;
  expected_output: string;
  
  // Scoring
  points_earned: number;
  points_possible: number;
  
  // Performance
  execution_time_ms: number;
  
  // Error information
  error?: string;
}
```

### IPC Command

```rust
#[tauri::command]
async fn run_local_tests(
    lesson_path: String,
    project_path: String,
    language: String,
    code: String,
) -> Result<GradingResult, ShellError>
```

---

## Cloud Grading API

Cloud grading provides additional capabilities for teachers:

- Hidden test cases
- Plagiarism detection
- Persistent submission history
- Analytics

### Authentication

```
Authorization: Bearer <api_token>
X-License-Key: <teacher_license>
```

### Endpoints

#### Submit for Grading

```
POST /api/v1/submissions
```

**Request Body:**

```json
{
  "lesson_id": "python-hello-world",
  "language": "python",
  "code": "print('Hello, World!')",
  "project_files": [
    {
      "path": "main.py",
      "content": "print('Hello, World!')"
    }
  ],
  "classroom_id": "optional-classroom-id",
  "student_id": "optional-anonymous-id"
}
```

**Response:**

```json
{
  "submission_id": "sub_abc123",
  "status": "queued",
  "estimated_wait_seconds": 5,
  "poll_url": "/api/v1/submissions/sub_abc123"
}
```

#### Get Submission Result

```
GET /api/v1/submissions/{submission_id}
```

**Response:**

```json
{
  "submission_id": "sub_abc123",
  "status": "completed",
  "result": {
    "lesson_id": "python-hello-world",
    "total_points": 100,
    "max_points": 100,
    "percentage": 100.0,
    "test_results": [
      {
        "id": "hello-world",
        "name": "Prints Hello, World!",
        "passed": true,
        "points_earned": 50,
        "points_possible": 50,
        "execution_time_ms": 45
      },
      {
        "id": "hidden-test-1",
        "name": "Hidden Test",
        "passed": true,
        "points_earned": 50,
        "points_possible": 50,
        "hidden": true
      }
    ],
    "feedback": "Perfect score! Excellent work!",
    "graded_at": "2026-01-13T10:30:00Z",
    "graded_by": "Cloud"
  },
  "plagiarism": {
    "checked": true,
    "score": 0.0,
    "matches": []
  }
}
```

### Webhook Events

For async grading results:

```
POST {callback_url}
X-Shell-Signature: sha256=...
```

```json
{
  "event": "submission.completed",
  "submission_id": "sub_abc123",
  "result": { ... }
}
```

---

## Grading Worker Architecture

Cloud grading uses stateless workers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Grading Service                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐ │
│  │   API    │───▶│    Queue     │───▶│  Grading Workers  │ │
│  │ Gateway  │    │  (Redis/SQS) │    │   (Kubernetes)    │ │
│  └──────────┘    └──────────────┘    └───────────────────┘ │
│       │                                       │             │
│       │         ┌──────────────┐              │             │
│       └────────▶│   Results    │◀─────────────┘             │
│                 │   Database   │                            │
│                 └──────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Worker Container Spec

Each grading job runs in an isolated container:

```yaml
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
  requests:
    memory: "256Mi"
    cpu: "250m"

securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]

# No network access
networkPolicy:
  egress: []
```

### Language Containers

Pre-built containers for each language:

| Language | Image | Version |
|----------|-------|---------|
| Python | `shell/grader-python:3.12` | 3.12 |
| JavaScript | `shell/grader-node:20` | Node 20 |
| TypeScript | `shell/grader-node:20` | Node 20 + tsx |
| Rust | `shell/grader-rust:1.75` | 1.75 |
| Go | `shell/grader-go:1.21` | 1.21 |
| Java | `shell/grader-java:21` | OpenJDK 21 |
| C/C++ | `shell/grader-gcc:13` | GCC 13 |
| Ruby | `shell/grader-ruby:3.3` | 3.3 |

---

## Plagiarism Detection

Optional service for teacher accounts.

### Algorithm

1. **Tokenization** - Convert code to language-agnostic tokens
2. **Normalization** - Remove comments, whitespace, rename variables
3. **Fingerprinting** - Generate winnowing fingerprints
4. **Comparison** - Compare against corpus of submissions
5. **Scoring** - Calculate similarity percentage

### Response

```json
{
  "checked": true,
  "score": 0.85,
  "threshold": 0.70,
  "flagged": true,
  "matches": [
    {
      "submission_id": "sub_xyz789",
      "similarity": 0.85,
      "matched_lines": [
        { "source": [1, 10], "match": [5, 14] }
      ]
    }
  ]
}
```

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `GRADING_TIMEOUT` | Execution exceeded time limit |
| `GRADING_MEMORY` | Memory limit exceeded |
| `GRADING_COMPILE` | Compilation error |
| `GRADING_RUNTIME` | Runtime error |
| `GRADING_NETWORK` | Attempted network access |
| `CLOUD_UNAVAILABLE` | Cloud service unreachable |
| `LICENSE_REQUIRED` | Feature requires teacher license |

### Fallback Behavior

When cloud is unavailable:

1. Run local tests (visible only)
2. Display warning: "Cloud grading unavailable. Partial results shown."
3. Cache submission for later sync (if enabled)

---

## Rate Limits

| Plan | Submissions/min | Submissions/day |
|------|-----------------|-----------------|
| Student (Free) | 10 | 100 |
| Teacher Individual | 60 | 1000 |
| Teacher Institution | 300 | 10000 |
| Enterprise | Custom | Custom |

---

## Security Considerations

1. **Code Execution** - All student code runs in isolated containers
2. **Network Isolation** - No outbound network during grading
3. **Resource Limits** - CPU, memory, and time limits enforced
4. **Input Sanitization** - All inputs validated before execution
5. **No Persistence** - Containers are ephemeral
6. **Audit Logging** - All submissions logged (cloud only)

---

## License

This specification is released under the MIT License.

The cloud implementation is proprietary to Shell.

Copyright © 2026 Shell Contributors
