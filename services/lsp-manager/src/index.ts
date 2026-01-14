/**
 * Shell LSP Manager
 *
 * Manages Language Server Protocol servers for the Shell IDE.
 * LSP is the primary mechanism for language support - no custom tooling.
 */

import { LspServerRegistry, type LspServerConfig } from "./registry.js";
import { LspServerProcess } from "./process.js";
import { discoverServers } from "./discovery.js";

export class LspManager {
  private registry: LspServerRegistry;
  private processes: Map<string, LspServerProcess> = new Map();

  constructor() {
    this.registry = new LspServerRegistry();
    this.initializeDefaultServers();
  }

  /**
   * Initialize the manager with default server configurations
   */
  private initializeDefaultServers(): void {
    // These are the well-known LSP servers we support out of the box
    const defaultServers: LspServerConfig[] = [
      // Python
      {
        language: "python",
        name: "Pylsp",
        command: "pylsp",
        args: [],
        installCommand: "pip install python-lsp-server",
      },
      {
        language: "python",
        name: "Pyright",
        command: "pyright-langserver",
        args: ["--stdio"],
        installCommand: "npm install -g pyright",
        priority: 10, // Preferred over Pylsp
      },

      // JavaScript/TypeScript
      {
        language: "javascript",
        name: "TypeScript Language Server",
        command: "typescript-language-server",
        args: ["--stdio"],
        installCommand: "npm install -g typescript-language-server typescript",
      },
      {
        language: "typescript",
        name: "TypeScript Language Server",
        command: "typescript-language-server",
        args: ["--stdio"],
        installCommand: "npm install -g typescript-language-server typescript",
      },

      // Rust
      {
        language: "rust",
        name: "rust-analyzer",
        command: "rust-analyzer",
        args: [],
        installCommand: "rustup component add rust-analyzer",
      },

      // Go
      {
        language: "go",
        name: "gopls",
        command: "gopls",
        args: [],
        installCommand: "go install golang.org/x/tools/gopls@latest",
      },

      // Java
      {
        language: "java",
        name: "Eclipse JDT LS",
        command: "jdtls",
        args: [],
        installCommand: "See https://github.com/eclipse/eclipse.jdt.ls",
      },

      // C/C++
      {
        language: "c",
        name: "clangd",
        command: "clangd",
        args: [],
        installCommand: "Install LLVM/Clang",
      },
      {
        language: "cpp",
        name: "clangd",
        command: "clangd",
        args: [],
        installCommand: "Install LLVM/Clang",
      },

      // Ruby
      {
        language: "ruby",
        name: "Solargraph",
        command: "solargraph",
        args: ["stdio"],
        installCommand: "gem install solargraph",
      },

      // Web (HTML/CSS/JSON)
      {
        language: "html",
        name: "vscode-html-language-server",
        command: "vscode-html-language-server",
        args: ["--stdio"],
        installCommand: "npm install -g vscode-langservers-extracted",
      },
      {
        language: "css",
        name: "vscode-css-language-server",
        command: "vscode-css-language-server",
        args: ["--stdio"],
        installCommand: "npm install -g vscode-langservers-extracted",
      },
      {
        language: "json",
        name: "vscode-json-language-server",
        command: "vscode-json-language-server",
        args: ["--stdio"],
        installCommand: "npm install -g vscode-langservers-extracted",
      },
    ];

    for (const server of defaultServers) {
      this.registry.register(server);
    }
  }

  /**
   * Discover available LSP servers on the system
   */
  async discover(): Promise<Map<string, LspServerConfig[]>> {
    const discovered = await discoverServers(this.registry.getAll());
    return discovered;
  }

  /**
   * Start a language server for a specific language
   */
  async start(
    language: string,
    workspacePath: string
  ): Promise<LspServerProcess> {
    const processId = `${language}:${workspacePath}`;

    // Check if already running
    const existing = this.processes.get(processId);
    if (existing?.isRunning()) {
      return existing;
    }

    // Find the best available server for this language
    const config = await this.registry.findBest(language);
    if (!config) {
      throw new Error(`No LSP server available for language: ${language}`);
    }

    // Start the server
    const process = new LspServerProcess(config, workspacePath);
    await process.start();

    this.processes.set(processId, process);
    return process;
  }

  /**
   * Stop a running language server
   */
  async stop(language: string, workspacePath: string): Promise<void> {
    const processId = `${language}:${workspacePath}`;
    const process = this.processes.get(processId);

    if (process) {
      await process.stop();
      this.processes.delete(processId);
    }
  }

  /**
   * Stop all running language servers
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.processes.values()).map((p) =>
      p.stop()
    );
    await Promise.all(stopPromises);
    this.processes.clear();
  }

  /**
   * Get status of all running servers
   */
  getStatus(): Map<string, { language: string; running: boolean }> {
    const status = new Map<string, { language: string; running: boolean }>();

    for (const [id, process] of this.processes) {
      const [language] = id.split(":");
      status.set(id, {
        language,
        running: process.isRunning(),
      });
    }

    return status;
  }

  /**
   * Register a custom LSP server
   */
  registerCustomServer(config: LspServerConfig): void {
    this.registry.register(config);
  }

  /**
   * Get all registered servers for a language
   */
  getServersForLanguage(language: string): LspServerConfig[] {
    return this.registry.getForLanguage(language);
  }
}

// Export types
export type { LspServerConfig } from "./registry.js";
export { LspServerProcess } from "./process.js";
