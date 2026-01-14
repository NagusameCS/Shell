/**
 * LSP Server Process
 *
 * Manages a running LSP server process.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import type { LspServerConfig } from "./registry.js";

export class LspServerProcess extends EventEmitter {
  private config: LspServerConfig;
  private workspacePath: string;
  private process: ChildProcess | null = null;
  private running = false;

  constructor(config: LspServerConfig, workspacePath: string) {
    super();
    this.config = config;
    this.workspacePath = workspacePath;
  }

  /**
   * Start the LSP server
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    const env = {
      ...process.env,
      ...this.config.env,
    };

    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.workspacePath,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.running = true;

    // Handle stdout (LSP messages)
    this.process.stdout?.on("data", (data: Buffer) => {
      this.emit("message", data);
    });

    // Handle stderr (logs/errors)
    this.process.stderr?.on("data", (data: Buffer) => {
      this.emit("log", data.toString());
    });

    // Handle process exit
    this.process.on("exit", (code, signal) => {
      this.running = false;
      this.emit("exit", { code, signal });
    });

    this.process.on("error", (error) => {
      this.running = false;
      this.emit("error", error);
    });

    // Wait for the server to be ready
    await this.waitForReady();
  }

  /**
   * Wait for the server to be ready to receive messages
   */
  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("LSP server startup timeout"));
      }, 10000);

      // Consider ready once we receive any output
      const onMessage = () => {
        clearTimeout(timeout);
        this.off("message", onMessage);
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.once("message", onMessage);
      this.once("error", onError);

      // If stdio, send a ping after a short delay
      setTimeout(resolve, 100);
    });
  }

  /**
   * Send a message to the LSP server
   */
  send(message: string): void {
    if (!this.process?.stdin) {
      throw new Error("Server not running");
    }

    const content = Buffer.from(message, "utf-8");
    const header = `Content-Length: ${content.length}\r\n\r\n`;

    this.process.stdin.write(header);
    this.process.stdin.write(content);
  }

  /**
   * Send a JSON-RPC request
   */
  sendRequest(
    method: string,
    params?: unknown,
    id?: number | string
  ): void {
    const request = {
      jsonrpc: "2.0",
      id: id || Date.now(),
      method,
      params,
    };

    this.send(JSON.stringify(request));
  }

  /**
   * Send a JSON-RPC notification
   */
  sendNotification(method: string, params?: unknown): void {
    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    this.send(JSON.stringify(notification));
  }

  /**
   * Stop the LSP server
   */
  async stop(): Promise<void> {
    if (!this.running || !this.process) {
      return;
    }

    // Send shutdown request
    this.sendRequest("shutdown");

    // Wait a bit for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Send exit notification
    this.sendNotification("exit");

    // Wait a bit more
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Force kill if still running
    if (this.running) {
      this.process.kill("SIGTERM");

      // Wait, then SIGKILL if necessary
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (this.running) {
        this.process.kill("SIGKILL");
      }
    }

    this.running = false;
    this.process = null;
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the server configuration
   */
  getConfig(): LspServerConfig {
    return this.config;
  }

  /**
   * Get the workspace path
   */
  getWorkspacePath(): string {
    return this.workspacePath;
  }
}
