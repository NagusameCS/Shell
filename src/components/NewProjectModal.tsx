/**
 * New Project Modal
 * 
 * Allows users to:
 * - Choose a stack (language/framework) including Web Dev
 * - Start from scratch (empty workspace)
 * - Use a template
 */

import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { homeDir, join } from "@tauri-apps/api/path";
import {
  X,
  Folder,
  Code2,
  FileCode,
  Braces,
  Coffee,
  Globe,
  Flame,
  Zap,
  Atom,
  Box,
  Layout,
} from "lucide-react";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (path: string) => void;
}

interface Stack {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: "general" | "web" | "systems";
}

const STACKS: Stack[] = [
  // General
  {
    id: "scratch",
    name: "From Scratch",
    icon: <Folder className="h-6 w-6" />,
    description: "Empty folder, start fresh",
    category: "general",
  },
  {
    id: "python",
    name: "Python",
    icon: <Code2 className="h-6 w-6" />,
    description: "Python project with main.py",
    category: "general",
  },
  {
    id: "java",
    name: "Java",
    icon: <Coffee className="h-6 w-6" />,
    description: "Java project with Main.java",
    category: "general",
  },
  // Web Development
  {
    id: "html-css-js",
    name: "HTML/CSS/JS",
    icon: <Globe className="h-6 w-6" />,
    description: "Basic web project",
    category: "web",
  },
  {
    id: "react",
    name: "React",
    icon: <Atom className="h-6 w-6" />,
    description: "React with Vite",
    category: "web",
  },
  {
    id: "nextjs",
    name: "Next.js",
    icon: <Box className="h-6 w-6" />,
    description: "Full-stack React framework",
    category: "web",
  },
  {
    id: "vue",
    name: "Vue",
    icon: <Layout className="h-6 w-6" />,
    description: "Vue.js with Vite",
    category: "web",
  },
  {
    id: "typescript",
    name: "TypeScript",
    icon: <FileCode className="h-6 w-6" />,
    description: "TypeScript project with tsconfig",
    category: "web",
  },
  {
    id: "javascript",
    name: "Node.js",
    icon: <Braces className="h-6 w-6" />,
    description: "Node.js project with package.json",
    category: "web",
  },
  // Systems
  {
    id: "rust",
    name: "Rust",
    icon: <Flame className="h-6 w-6" />,
    description: "Rust project with Cargo",
    category: "systems",
  },
  {
    id: "c",
    name: "C/C++",
    icon: <Zap className="h-6 w-6" />,
    description: "C/C++ project with Makefile",
    category: "systems",
  },
];

// Template files for each stack
const TEMPLATES: Record<string, Record<string, string>> = {
  scratch: {},
  python: {
    "main.py": `#!/usr/bin/env python3
"""
Shell IDE - Python Project
"""

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`,
    "README.md": `# Python Project

Created with Shell IDE.

## Getting Started

\`\`\`bash
python main.py
\`\`\`
`,
  },
  java: {
    "src/Main.java": `/**
 * Shell IDE - Java Project
 */
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
    "README.md": `# Java Project

Created with Shell IDE.

## Getting Started

\`\`\`bash
javac src/Main.java -d out
java -cp out Main
\`\`\`
`,
  },
  "html-css-js": {
    "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Hello, World!</h1>
    <p>Welcome to my website.</p>
    <script src="script.js"></script>
</body>
</html>
`,
    "styles.css": `/* Shell IDE - CSS Styles */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
}

h1 {
    color: #333;
    margin-bottom: 1rem;
}
`,
    "script.js": `// Shell IDE - JavaScript

console.log("Hello from JavaScript!");

document.addEventListener("DOMContentLoaded", () => {
    console.log("Page loaded!");
});
`,
    "README.md": `# Web Project

Created with Shell IDE.

## Getting Started

Open \`index.html\` in your browser, or use a local server:

\`\`\`bash
npx serve .
\`\`\`
`,
  },
  react: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
    "src/App.jsx": `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>Hello, React!</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}

export default App
`,
    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app {
  text-align: center;
}

button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
`,
    "package.json": `{
  "name": "react-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}
`,
    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
    "README.md": `# React App

Created with Shell IDE.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
  nextjs: {
    "package.json": `{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`,
    "app/page.jsx": `export default function Home() {
  return (
    <main>
      <h1>Hello, Next.js!</h1>
      <p>Welcome to your new app.</p>
    </main>
  )
}
`,
    "app/layout.jsx": `export const metadata = {
  title: 'Next.js App',
  description: 'Created with Shell IDE',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`,
    "app/globals.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  padding: 2rem;
}

h1 {
  margin-bottom: 1rem;
}
`,
    "README.md": `# Next.js App

Created with Shell IDE.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
  vue: {
    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
    "src/main.js": `import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
`,
    "src/App.vue": `<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div class="app">
    <h1>Hello, Vue!</h1>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>

<style scoped>
.app {
  text-align: center;
}

button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
</style>
`,
    "src/style.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
`,
    "package.json": `{
  "name": "vue-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.0.0",
    "vite": "^5.0.0"
  }
}
`,
    "vite.config.js": `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
`,
    "README.md": `# Vue App

Created with Shell IDE.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  },
  typescript: {
    "src/index.ts": `/**
 * Shell IDE - TypeScript Project
 */

function main(): void {
  console.log("Hello, World!");
}

main();
`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
`,
    "package.json": `{
  "name": "typescript-project",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
`,
    "README.md": `# TypeScript Project

Created with Shell IDE.

## Getting Started

\`\`\`bash
npm install
npm run build
npm start
\`\`\`
`,
  },
  javascript: {
    "index.js": `/**
 * Shell IDE - Node.js Project
 */

function main() {
  console.log("Hello, World!");
}

main();
`,
    "package.json": `{
  "name": "node-project",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
`,
    "README.md": `# Node.js Project

Created with Shell IDE.

## Getting Started

\`\`\`bash
npm start
\`\`\`
`,
  },
  rust: {
    "src/main.rs": `// Shell IDE - Rust Project

fn main() {
    println!("Hello, World!");
}
`,
    "Cargo.toml": `[package]
name = "rust-project"
version = "0.1.0"
edition = "2021"

[dependencies]
`,
    "README.md": `# Rust Project

Created with Shell IDE.

## Getting Started

\`\`\`bash
cargo run
\`\`\`
`,
  },
  c: {
    "main.c": `/**
 * Shell IDE - C Project
 */
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
    "Makefile": `CC=gcc
CFLAGS=-Wall -Wextra

main: main.c
\t$(CC) $(CFLAGS) -o main main.c

clean:
\trm -f main

.PHONY: clean
`,
    "README.md": `# C Project

Created with Shell IDE.

## Getting Started

\`\`\`bash
make
./main
\`\`\`
`,
  },
};

export function NewProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: NewProjectModalProps) {
  const [selectedStack, setSelectedStack] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<"stack" | "name">("stack");
  const [error, setError] = useState<string | null>(null);
  const [defaultShellDir, setDefaultShellDir] = useState<string | null>(null);
  const [useDefaultDir, setUseDefaultDir] = useState(true);

  // Get the default Shell projects directory
  useEffect(() => {
    async function getDefaultDir() {
      try {
        const home = await homeDir();
        const shellDir = await join(home, "Shell");
        setDefaultShellDir(shellDir);
      } catch (err) {
        console.error("Failed to get home directory:", err);
      }
    }
    if (isOpen) {
      getDefaultDir();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStackSelect = (stackId: string) => {
    setSelectedStack(stackId);
    setStep("name");
  };

  const handleBack = () => {
    setStep("stack");
    setSelectedStack(null);
    setError(null);
  };

  const handleCreate = async () => {
    if (!selectedStack || !projectName.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      let parentDir: string | null = null;
      
      if (useDefaultDir && defaultShellDir) {
        // Use ~/Shell as the default directory
        parentDir = defaultShellDir;
        // Ensure the Shell directory exists
        try {
          await invoke("create_directory", { path: defaultShellDir });
        } catch {
          // Directory might already exist, that's fine
        }
      } else {
        // Select destination folder
        parentDir = await open({
          directory: true,
          multiple: false,
          title: "Select folder to create project in",
          defaultPath: defaultShellDir || undefined,
        });
      }

      if (!parentDir) {
        setIsCreating(false);
        return;
      }

      // Create project folder and files
      const projectPath = `${parentDir}/${projectName}`;
      
      // Create the project directory
      await invoke("create_directory", { path: projectPath });
      
      // Create template files
      const template = TEMPLATES[selectedStack] || {};
      for (const [filePath, content] of Object.entries(template)) {
        const fullPath = `${projectPath}/${filePath}`;
        // Create parent directories if needed
        const parentPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (parentPath !== projectPath) {
          await invoke("create_directory", { path: parentPath });
        }
        await invoke("write_file", { path: fullPath, content });
      }

      onProjectCreated(projectPath);
      handleClose();
    } catch (err) {
      console.error("Failed to create project:", err);
      setError("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep("stack");
    setSelectedStack(null);
    setProjectName("");
    setError(null);
    onClose();
  };

  const generalStacks = STACKS.filter(s => s.category === "general");
  const webStacks = STACKS.filter(s => s.category === "web");
  const systemsStacks = STACKS.filter(s => s.category === "systems");

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-[#252526] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {step === "stack" ? "New Project" : "Name Your Project"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded p-1 text-[#9ca3af] hover:bg-[#3c3c3c] hover:text-white"
            aria-label="Close modal"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-[#ef4444]/20 px-4 py-2 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        {step === "stack" ? (
          /* Stack selection */
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* General */}
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                General
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {generalStacks.map((stack) => (
                  <button
                    key={stack.id}
                    onClick={() => handleStackSelect(stack.id)}
                    className="flex flex-col items-center gap-2 rounded-lg bg-[#3c3c3c] p-3 text-white hover:bg-[#4a4a4a]"
                  >
                    <div className="text-[#7DD3FC]">{stack.icon}</div>
                    <span className="text-sm font-medium">{stack.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Web Development */}
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                Web Development
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {webStacks.map((stack) => (
                  <button
                    key={stack.id}
                    onClick={() => handleStackSelect(stack.id)}
                    className="flex flex-col items-center gap-2 rounded-lg bg-[#3c3c3c] p-3 text-white hover:bg-[#4a4a4a]"
                  >
                    <div className="text-[#34d399]">{stack.icon}</div>
                    <span className="text-sm font-medium">{stack.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Systems */}
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                Systems Programming
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {systemsStacks.map((stack) => (
                  <button
                    key={stack.id}
                    onClick={() => handleStackSelect(stack.id)}
                    className="flex flex-col items-center gap-2 rounded-lg bg-[#3c3c3c] p-3 text-white hover:bg-[#4a4a4a]"
                  >
                    <div className="text-[#f97316]">{stack.icon}</div>
                    <span className="text-sm font-medium">{stack.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Project name input */
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-[#9ca3af]">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, "-"))}
                placeholder="my-project"
                className="w-full rounded-lg bg-[#3c3c3c] px-4 py-3 text-white placeholder-[#6b7280] outline-none focus:ring-2 focus:ring-[#7DD3FC]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && projectName.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>

            <div className="rounded-lg bg-[#1e1e1e] p-3">
              <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                {STACKS.find((s) => s.id === selectedStack)?.icon}
                <span>
                  {STACKS.find((s) => s.id === selectedStack)?.description}
                </span>
              </div>
            </div>

            {/* Location selection */}
            <div>
              <label className="mb-2 block text-sm text-[#9ca3af]">
                Location
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 rounded-lg bg-[#3c3c3c] p-3 cursor-pointer hover:bg-[#4a4a4a] transition-colors">
                  <input
                    type="radio"
                    checked={useDefaultDir}
                    onChange={() => setUseDefaultDir(true)}
                    className="h-4 w-4 accent-[var(--accent-color)]"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-white">Default (~/Shell)</div>
                    <div className="text-xs text-[#6b7280]">
                      {defaultShellDir && projectName ? `${defaultShellDir}/${projectName}` : "Shell projects folder in your home directory"}
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg bg-[#3c3c3c] p-3 cursor-pointer hover:bg-[#4a4a4a] transition-colors">
                  <input
                    type="radio"
                    checked={!useDefaultDir}
                    onChange={() => setUseDefaultDir(false)}
                    className="h-4 w-4 accent-[var(--accent-color)]"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-white">Choose location...</div>
                    <div className="text-xs text-[#6b7280]">
                      Select a custom folder for this project
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 rounded-lg bg-[#3c3c3c] px-4 py-2 text-white hover:bg-[#4a4a4a]"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!projectName.trim() || isCreating}
                className="flex-1 rounded-lg bg-[#7DD3FC] px-4 py-2 font-medium text-[#1e1e1e] hover:bg-[#67c8f7] disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
