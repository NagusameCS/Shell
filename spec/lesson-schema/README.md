# Shell Lesson Format Specification

**Version:** 1.0.0  
**License:** MIT  
**Status:** Draft

---

## Overview

The Shell Lesson Format is a portable, versionable specification for educational programming lessons. It supports:

- Markdown content for explanations
- Starter code and solutions
- Automated test cases
- Manual grading rubrics
- Execution constraints
- IO diagrams for visualization

## File Format

Lessons can be authored in either **YAML** or **JSON** format. YAML is recommended for human authoring due to readability.

### File Naming

- `lesson.yaml` or `lesson.json` - Main lesson file
- Place in a directory with the lesson ID as the name

### Directory Structure

```
my-lesson/
├── lesson.yaml          # Lesson definition
├── starter.py           # Optional: External starter code
├── solution.py          # Optional: External solution
├── tests/               # Optional: Test files
│   ├── test_01.py
│   └── test_02.py
└── assets/              # Optional: Images, diagrams
    └── diagram.svg
```

## Schema

See [lesson.schema.json](lesson.schema.json) for the complete JSON Schema.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (lowercase, hyphens only) |
| `version` | string | Semantic version (e.g., "1.0.0") |
| `title` | string | Human-readable title |
| `description` | string | Brief description |
| `language` | string | Programming language |
| `difficulty` | string | "beginner", "intermediate", or "advanced" |
| `content` | object | Lesson content (see below) |

### Content Object

```yaml
content:
  explanation: |
    # Introduction to Variables
    
    Variables are containers for storing data values...
    
  starter_code: |
    # Write your code here
    name = ""
    
  solution: |
    name = input("What is your name? ")
    print(f"Hello, {name}!")
    
  hints:
    - "Use the input() function to get user input"
    - "Use print() to display output"
    - "f-strings let you embed variables in text"
    
  io_diagram:
    inputs:
      - label: "User Input"
        value: "Alice"
    outputs:
      - label: "Program Output"
        value: "Hello, Alice!"
```

### Grading Configuration

```yaml
grading:
  passing_score: 70
  
  local_tests:
    - id: test-basic
      name: "Basic Input/Output"
      input: "Alice\n"
      expected_output: "Hello, Alice!"
      output_type: contains
      points: 50
      hidden: false
      
    - id: test-empty
      name: "Empty Input"
      input: "\n"
      expected_output: "Hello, !"
      points: 25
      
  hidden_tests:
    - id: test-special
      name: "Special Characters"
      input: "O'Brien\n"
      expected_output: "Hello, O'Brien!"
      points: 25
      
  rubric:
    - id: style
      name: "Code Style"
      points: 10
      criteria:
        - "Uses meaningful variable names"
        - "Proper indentation"
```

### Constraints

```yaml
constraints:
  max_time_ms: 5000
  max_memory_bytes: 67108864  # 64MB
  allowed_imports:
    - math
    - random
  disallowed_imports:
    - os
    - subprocess
    - sys
  required_symbols:
    - calculate_sum
  max_lines: 50
```

## Example Lesson

```yaml
id: python-variables-intro
version: "1.0.0"
title: "Introduction to Variables"
description: "Learn how to create and use variables in Python"

author:
  name: "Shell Team"
  email: "lessons@shell.dev"

language: python
difficulty: beginner

tags:
  - fundamentals
  - variables
  - beginner-friendly

prerequisites: []

estimated_time_minutes: 15

content:
  explanation: |
    # Variables in Python
    
    A **variable** is a container for storing data values. In Python, you create
    a variable by assigning a value to a name:
    
    ```python
    message = "Hello, World!"
    count = 42
    price = 19.99
    is_active = True
    ```
    
    ## Naming Rules
    
    - Must start with a letter or underscore
    - Can contain letters, numbers, and underscores
    - Case-sensitive (`name` and `Name` are different)
    - Cannot be a reserved keyword
    
    ## Your Task
    
    Create a variable called `greeting` and assign it the value `"Hello!"`.
    Then print it.
    
  starter_code: |
    # Create a variable called 'greeting' with the value "Hello!"
    
    
    # Print the greeting

  solution: |
    greeting = "Hello!"
    print(greeting)

  hints:
    - "Variables are created using the = sign"
    - "String values need quotes around them"
    - "Use print() to display the value"

  io_diagram:
    outputs:
      - label: "Expected Output"
        value: "Hello!"

constraints:
  max_time_ms: 5000
  max_lines: 10

grading:
  passing_score: 100
  
  local_tests:
    - id: output-check
      name: "Correct Output"
      input: ""
      expected_output: "Hello!"
      output_type: contains
      points: 50
      
    - id: variable-check
      name: "Variable Named 'greeting'"
      input: ""
      expected_output: ""
      points: 50
```

## Portability

Lessons are designed to be:

1. **Self-contained** - All content in the lesson file
2. **Versionable** - Store in Git, track changes
3. **Shareable** - Export/import between systems
4. **Offline-capable** - No internet required to view or run

## Marketplace Integration

Lessons can be published to the Shell Marketplace with additional metadata:

```yaml
marketplace:
  price: 0  # Free, or price in cents
  license: CC-BY-4.0
  preview: true  # Show preview before purchase
  categories:
    - programming/python/fundamentals
```

---

## License

This specification is released under the MIT License.

Copyright © 2026 Shell Contributors
