/**
 * LSP Server Registry
 *
 * Manages available LSP server configurations.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Check if a command exists on the system
 */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`command -v ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

export interface LspServerConfig {
  /** Programming language this server supports */
  language: string;

  /** Human-readable name */
  name: string;

  /** Command to run the server */
  command: string;

  /** Command-line arguments */
  args: string[];

  /** Environment variables */
  env?: Record<string, string>;

  /** Installation instructions */
  installCommand?: string;

  /** Priority (higher = preferred) */
  priority?: number;

  /** Initialization options to send to the server */
  initializationOptions?: Record<string, unknown>;

  /** Custom settings for the server */
  settings?: Record<string, unknown>;
}

export class LspServerRegistry {
  private servers: Map<string, LspServerConfig[]> = new Map();

  /**
   * Register a new server configuration
   */
  register(config: LspServerConfig): void {
    const existing = this.servers.get(config.language) || [];
    existing.push(config);

    // Sort by priority (descending)
    existing.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.servers.set(config.language, existing);
  }

  /**
   * Get all servers for a language
   */
  getForLanguage(language: string): LspServerConfig[] {
    return this.servers.get(language) || [];
  }

  /**
   * Find the best available server for a language
   */
  async findBest(language: string): Promise<LspServerConfig | null> {
    const configs = this.getForLanguage(language);

    for (const config of configs) {
      if (await this.isAvailable(config)) {
        return config;
      }
    }

    return null;
  }

  /**
   * Check if a server is available (command exists)
   */
  async isAvailable(config: LspServerConfig): Promise<boolean> {
    return commandExists(config.command);
  }

  /**
   * Get all registered servers
   */
  getAll(): LspServerConfig[] {
    const all: LspServerConfig[] = [];
    for (const configs of this.servers.values()) {
      all.push(...configs);
    }
    return all;
  }

  /**
   * Remove a server configuration
   */
  unregister(language: string, name: string): void {
    const existing = this.servers.get(language) || [];
    const filtered = existing.filter((c) => c.name !== name);
    this.servers.set(language, filtered);
  }
}
