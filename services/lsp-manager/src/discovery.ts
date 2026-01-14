/**
 * LSP Server Discovery
 *
 * Automatically discover available LSP servers on the system.
 */

import { exec } from "child_process";
import { promisify } from "util";
import type { LspServerConfig } from "./registry.js";

const execAsync = promisify(exec);

/**
 * Check if a command exists on the system using 'command -v'
 */
async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execAsync(`command -v ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover which LSP servers are available on the system
 */
export async function discoverServers(
  configs: LspServerConfig[]
): Promise<Map<string, LspServerConfig[]>> {
  const available = new Map<string, LspServerConfig[]>();

  for (const config of configs) {
    try {
      const exists = await commandExists(config.command);
      if (exists) {
        // Server is available
        const existing = available.get(config.language) || [];
        existing.push(config);
        available.set(config.language, existing);
      }
    } catch {
      // Server not installed, skip
    }
  }

  // Sort by priority within each language
  for (const [language, servers] of available) {
    servers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    available.set(language, servers);
  }

  return available;
}

/**
 * Check if a specific command is available
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  return commandExists(command);
}

/**
 * Get installation instructions for missing servers
 */
export async function getMissingServers(
  configs: LspServerConfig[],
  requiredLanguages: string[]
): Promise<LspServerConfig[]> {
  const missing: LspServerConfig[] = [];

  for (const language of requiredLanguages) {
    const languageConfigs = configs.filter((c) => c.language === language);

    let hasAny = false;
    for (const config of languageConfigs) {
      const exists = await commandExists(config.command);
      if (exists) {
        hasAny = true;
        break;
      }
    }

    if (!hasAny && languageConfigs.length > 0) {
      // Add the highest priority server for this language
      missing.push(languageConfigs[0]);
    }
  }

  return missing;
}
