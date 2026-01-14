# Shell IDE

**An education-first, local-first, offline-capable IDE for students and teachers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

Shell is an IDE designed from the ground up for learning. It prioritizes:

- **Local-first**: Everything works without internet
- **Offline-capable**: No cloud dependency for core functionality
- **Language-agnostic**: Any language with LSP support works
- **Open-source client**: MIT licensed, no vendor lock-in
- **Education-optimized**: Built for students, not professionals

## Distributions

### Shell (Student) — Free
- No account required
- Local filesystem storage
- Local execution via Docker
- Full editor functionality
- Offline lesson rendering

### Shell Teacher — Paid
- Cloud sync
- Classroom management
- Assignment distribution
- Auto-grading
- Analytics dashboard
- Secure exam mode

**Important**: Both distributions share the same codebase. Features are unlocked via feature flags, not code forks.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Shell IDE                               │
├─────────────────────────────────────────────────────────────┤
│  Frontend (TypeScript + React)                               │
│  ├── Monaco Editor                                           │
│  ├── Lesson Renderer                                         │
│  ├── UI Components                                           │
│  └── Diagram Visualizer                                      │
├─────────────────────────────────────────────────────────────┤
│  IPC Layer (Tauri Commands)                                  │
├─────────────────────────────────────────────────────────────┤
│  Rust Core (Authoritative Host)                              │
│  ├── Filesystem Access                                       │
│  ├── Process Spawning                                        │
│  ├── Docker Orchestration                                    │
│  ├── Security Boundaries                                     │
│  └── SQLite Metadata                                         │
├─────────────────────────────────────────────────────────────┤
│  Node Services (Managed by Rust)                             │
│  ├── LSP Manager                                             │
│  ├── Test Runners                                            │
│  └── Local Graders                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (v20+)
- [Docker](https://docker.com/) (for execution)
- [pnpm](https://pnpm.io/) (package manager)

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

---

## Project Structure

```
shell/
├── src-tauri/              # Rust core (Tauri backend)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/       # IPC command handlers
│   │   ├── docker/         # Container orchestration
│   │   ├── fs/             # Filesystem operations
│   │   ├── security/       # Sandboxing & permissions
│   │   └── db/             # SQLite operations
│   └── Cargo.toml
├── src/                    # React frontend
│   ├── components/
│   ├── editor/
│   ├── lessons/
│   ├── hooks/
│   └── main.tsx
├── services/               # Node.js services
│   ├── lsp-manager/
│   ├── test-runner/
│   └── local-grader/
├── spec/                   # MIT-licensed specifications
│   ├── lesson-schema/
│   └── grading-api/
└── docs/                   # Documentation
```

---

## License

- **Client**: MIT
- **Lesson Format Specification**: MIT
- **Plugin System**: MIT
- **Cloud Backend**: Proprietary
- **Self-hosted Cloud**: Commercial License

Shell™ and Shelly™ are trademarks.

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.
