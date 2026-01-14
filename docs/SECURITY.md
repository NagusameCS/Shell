# Shell Security Model

This document describes the security architecture of Shell IDE, with particular attention to the isolation of student code execution and the protection of assignment integrity.

## Design Principles

1. **Defense in Depth**: Multiple layers of security, any of which can fail independently
2. **Least Privilege**: Components only have access to what they need
3. **Distrust User Code**: All student-submitted code is treated as potentially malicious
4. **Transparent Boundaries**: Security boundaries are clearly defined and auditable

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Shell IDE                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     React Frontend                           │   │
│  │                    (Untrusted Zone)                          │   │
│  │  • User input handling                                       │   │
│  │  • Monaco Editor (sandboxed WebView)                         │   │
│  │  • No direct system access                                   │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              │ IPC (validated)                      │
│  ┌───────────────────────────▼─────────────────────────────────┐   │
│  │                     Rust Core                                │   │
│  │                   (Authoritative Host)                       │   │
│  │  • SecurityPolicy enforcement                                │   │
│  │  • All resource access validation                            │   │
│  │  • Feature flag management                                   │   │
│  │  • Database encryption                                       │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────▼─────────────────────────────────┐   │
│  │               Docker Execution Sandbox                       │   │
│  │                  (Maximum Isolation)                         │   │
│  │  • No network access                                         │   │
│  │  • Memory/CPU limits                                         │   │
│  │  • Time limits                                               │   │
│  │  • Read-only filesystem (except /tmp)                        │   │
│  │  • Dropped capabilities                                      │   │
│  │  • No privileged operations                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Security Zones

### Zone 1: Frontend (Untrusted)

The React frontend is treated as untrusted. It:

- Cannot access the filesystem directly
- Cannot spawn processes
- Cannot access network resources
- Communicates only through IPC commands

All IPC commands are validated by the Rust core before execution.

### Zone 2: Rust Core (Authoritative Host)

The Rust backend is the security enforcement layer:

```rust
pub struct SecurityPolicy {
    /// Files/directories accessible for reading
    pub allowed_read_paths: Vec<PathBuf>,
    
    /// Files/directories accessible for writing
    pub allowed_write_paths: Vec<PathBuf>,
    
    /// Maximum file size that can be written (bytes)
    pub max_file_size: u64,
    
    /// Whether network access is permitted
    pub allow_network: bool,
    
    /// Maximum execution time (seconds)
    pub max_execution_time: u64,
}
```

Every IPC command is checked against the active security policy before execution.

### Zone 3: Docker Sandbox (Maximum Isolation)

Student code executes in Docker containers with strict isolation:

| Security Control | Value | Purpose |
|-----------------|-------|---------|
| Memory Limit | 256 MB | Prevent OOM attacks |
| CPU Quota | 50% | Fair scheduling |
| Execution Timeout | 30 seconds | Prevent infinite loops |
| Network | Disabled | Prevent exfiltration |
| Filesystem | Read-only (except /tmp) | Prevent persistence |
| Capabilities | All dropped | No privilege escalation |
| User | Non-root | Reduced privileges |

---

## Filesystem Security

### Path Validation

All filesystem operations validate paths against the security policy:

```rust
pub fn validate_path(
    path: &Path, 
    operation: FileOperation, 
    policy: &SecurityPolicy
) -> Result<(), SecurityError> {
    // 1. Canonicalize path (resolve symlinks, ../, etc.)
    let canonical = path.canonicalize()?;
    
    // 2. Check against allowed paths for operation type
    let allowed = match operation {
        FileOperation::Read => &policy.allowed_read_paths,
        FileOperation::Write => &policy.allowed_write_paths,
    };
    
    // 3. Ensure path is within allowed directories
    for allowed_path in allowed {
        if canonical.starts_with(allowed_path) {
            return Ok(());
        }
    }
    
    Err(SecurityError::PathNotAllowed(canonical))
}
```

### Path Traversal Prevention

- All paths are canonicalized before validation
- Symlink resolution prevents escape via symbolic links
- Relative path components (`..`) are resolved before checking

### Workspace Isolation

Each opened project has its own security context:

```rust
let policy = SecurityPolicy {
    allowed_read_paths: vec![
        workspace_root.clone(),
        PathBuf::from("/usr/share"), // System docs
    ],
    allowed_write_paths: vec![
        workspace_root.clone(),
    ],
    max_file_size: 10 * 1024 * 1024, // 10 MB
    allow_network: false,
    max_execution_time: 30,
};
```

---

## Code Execution Security

### Docker Container Configuration

```rust
pub async fn create_sandbox(&self, request: &ExecutionRequest) -> Result<()> {
    let config = Config {
        image: Some(request.image.clone()),
        cmd: Some(vec!["sh", "-c", &request.command]),
        
        // Resource limits
        host_config: Some(HostConfig {
            memory: Some(256 * 1024 * 1024),        // 256 MB
            memory_swap: Some(256 * 1024 * 1024),   // No swap
            cpu_quota: Some(50000),                  // 50% CPU
            cpu_period: Some(100000),
            
            // Network isolation
            network_mode: Some("none".to_string()),
            
            // Filesystem isolation
            read_only_rootfs: Some(true),
            tmpfs: Some(hashmap!{
                "/tmp".to_string() => "size=64m,noexec".to_string()
            }),
            
            // Security hardening
            cap_drop: Some(vec!["ALL".to_string()]),
            security_opt: Some(vec![
                "no-new-privileges:true".to_string()
            ]),
            
            ..Default::default()
        }),
        
        // Non-root user
        user: Some("1000:1000".to_string()),
        
        ..Default::default()
    };
    
    self.docker.create_container(None, config).await?;
    Ok(())
}
```

### I/O Tracing

All container I/O is captured and rate-limited:

```rust
pub struct IoTrace {
    pub stdin: Vec<String>,   // What was sent to the process
    pub stdout: Vec<String>,  // What the process printed
    pub stderr: Vec<String>,  // Error output
    pub timestamps: Vec<u64>, // Timing for each event
}
```

### Timeout Enforcement

Execution is bounded by a timeout:

```rust
tokio::select! {
    result = container.wait() => {
        // Normal completion
        Ok(result)
    }
    _ = tokio::time::sleep(Duration::from_secs(timeout)) => {
        // Timeout - kill container
        container.kill("SIGKILL").await?;
        Err(ExecutionError::Timeout)
    }
}
```

---

## Assignment Integrity

### Hidden Test Protection

Hidden tests are protected through multiple mechanisms:

1. **Server-side grading**: Hidden tests only exist on the cloud grading service
2. **No local storage**: Hidden test content is never transmitted to the client
3. **Result verification**: Grading results are signed by the cloud service

### Lesson File Integrity

Lesson files can be signed to prevent tampering:

```yaml
# lesson.yaml
metadata:
  title: "Introduction to Arrays"
  checksum: "sha256:abcd1234..."
  signature: "..."  # Teacher's signature
```

### Exam Mode

When exam mode is enabled (Teacher edition):

- Network access is completely disabled
- File system access is restricted to exam directory only
- No external editor/IDE can access the workspace
- All activity is logged for auditing

```rust
pub fn enter_exam_mode(policy: &mut SecurityPolicy) {
    policy.allow_network = false;
    policy.allowed_read_paths = vec![exam_directory.clone()];
    policy.allowed_write_paths = vec![exam_directory.clone()];
}
```

---

## Data Protection

### Local Database

The SQLite database is encrypted at rest:

```rust
pub fn open_database(path: &Path) -> Result<Connection> {
    let conn = Connection::open(path)?;
    
    // Enable SQLCipher encryption
    conn.execute_batch(&format!(
        "PRAGMA key = '{}';",
        get_encryption_key()?
    ))?;
    
    Ok(conn)
}
```

### Sensitive Data Handling

Sensitive data (API keys, tokens) follows these rules:

1. **Never in logs**: Debug output sanitizes sensitive fields
2. **Minimal lifetime**: Cleared from memory after use
3. **Secure storage**: Uses OS keychain where available

---

## IPC Security

### Command Validation

Every IPC command is validated before execution:

```rust
#[tauri::command]
pub async fn write_file(
    path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), Error> {
    let policy = state.security_policy.read().await;
    
    // Validate path against policy
    let path = PathBuf::from(&path);
    validate_path(&path, FileOperation::Write, &policy)?;
    
    // Validate content size
    if content.len() as u64 > policy.max_file_size {
        return Err(Error::FileTooLarge);
    }
    
    // Perform operation
    tokio::fs::write(&path, content).await?;
    
    Ok(())
}
```

### Input Sanitization

All string inputs are validated:

- Path components checked for invalid characters
- Command arguments escaped properly
- SQL queries use parameterized statements

---

## Network Security

### Cloud Communication

Communication with cloud services:

- TLS 1.3 required
- Certificate pinning for known endpoints
- Request signing for authentication

### Local Network

Local network access is disabled during execution by default.

---

## Threat Model

### In Scope

| Threat | Mitigation |
|--------|------------|
| Malicious student code | Docker sandbox isolation |
| Path traversal attacks | Path canonicalization and validation |
| Resource exhaustion (DoS) | Memory, CPU, and time limits |
| Data exfiltration | Network disabled in sandbox |
| Privilege escalation | Dropped capabilities, non-root user |
| Hidden test theft | Server-side grading only |
| Assignment tampering | Cryptographic signatures |
| Cheating during exams | Exam mode isolation |

### Out of Scope

The following are explicitly not protected against:

- Physical access to the machine
- Compromised host operating system
- Side-channel attacks (timing, power analysis)
- Social engineering

---

## Audit Logging

Security-relevant events are logged:

```rust
pub enum SecurityEvent {
    PathAccessDenied { path: PathBuf, operation: FileOperation },
    ExecutionTimeout { container_id: String },
    MemoryLimitExceeded { container_id: String },
    InvalidLicenseAttempt { feature: String },
    ExamModeViolation { description: String },
}
```

Logs are stored locally and can be exported for review.

---

## Security Updates

### Responsible Disclosure

Security issues should be reported to: security@shell-ide.example (placeholder)

### Update Process

1. Security patches are released as highest priority
2. Automatic update checks (can be disabled)
3. Update signatures verified before installation

---

## Compliance Notes

Shell is designed with educational environments in mind:

- **FERPA**: No student data leaves the device without consent
- **COPPA**: Suitable for users under 13 (no account required)
- **GDPR**: Local-first design, no tracking

---

## Configuration

### Default Security Settings

```rust
pub fn default_security_policy() -> SecurityPolicy {
    SecurityPolicy {
        allowed_read_paths: vec![],  // Set when opening workspace
        allowed_write_paths: vec![], // Set when opening workspace
        max_file_size: 10 * 1024 * 1024, // 10 MB
        allow_network: false,
        max_execution_time: 30,
    }
}
```

### Teacher Overrides

Teachers can adjust certain limits for specific assignments:

```yaml
constraints:
  max_execution_time_ms: 60000  # 60 seconds for this lesson
  max_memory_mb: 512            # More memory for this lesson
```

These are validated against global maximums.

---

## Version

This security model applies to Shell v0.1.0 and above.

Last updated: 2024
