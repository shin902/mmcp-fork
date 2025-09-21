import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Config } from "../config";
import type { AgentAdapter, ApplyConfigOptions } from "./adapter";

export type ClaudeDesktopConfig = {
  mcpServers?: {
    [name: string]: unknown;
  };
  // keep any other top-level keys
  [key: string]: unknown;
};

export class ClaudeDesktopAgent implements AgentAdapter {
  readonly id = "claude-desktop" as const;

  applyConfig(config: Config, options: ApplyConfigOptions = {}): void {
    const agentConfig = this._loadConfig();
    const next =
      options.reset === true
        ? replaceConfig(agentConfig, config)
        : mergeConfig(agentConfig, config);
    this._saveConfig(next);
  }

  configPath(): string {
    const home = os.homedir();

    // macOS
    if (process.platform === "darwin") {
      return path.join(
        home,
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json",
      );
    }

    // Windows
    if (process.platform === "win32") {
      const appData = process.env.APPDATA;
      if (!appData) {
        throw new Error("Could not determine APPDATA directory.");
      }
      return path.join(appData, "Claude", "claude_desktop_config.json");
    }

    // Linux
    return path.join(home, ".config", "Claude", "claude_desktop_config.json");
  }

  private _loadConfig(): ClaudeDesktopConfig {
    const pathname = this.configPath();
    if (!fs.existsSync(pathname)) {
      return { mcpServers: {} };
    }
    const content = fs.readFileSync(pathname, "utf-8");
    return JSON.parse(content);
  }

  private _saveConfig(config: ClaudeDesktopConfig): void {
    const pathname = this.configPath();
    const dir = path.dirname(pathname);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = `${JSON.stringify(config, null, 2)}\n`;
    fs.writeFileSync(pathname, content, "utf-8");
  }
}

export function replaceConfig(
  agentConfig: ClaudeDesktopConfig,
  config: Config,
): ClaudeDesktopConfig {
  const entries = Object.entries(config.mcpServers);
  const next: ClaudeDesktopConfig = { ...agentConfig };

  if (entries.length === 0) {
    delete next.mcpServers;
    return next;
  }

  const servers: Record<string, unknown> = {};
  for (const [name, server] of entries) {
    servers[name] = server;
  }

  next.mcpServers = servers;
  return next;
}

export function mergeConfig(
  agentConfig: ClaudeDesktopConfig,
  config: Config,
): ClaudeDesktopConfig {
  const servers = Object.entries(config.mcpServers);
  if (servers.length === 0) {
    return agentConfig;
  }

  if (!agentConfig.mcpServers) {
    agentConfig.mcpServers = {};
  }

  for (const [name, server] of Object.entries(config.mcpServers)) {
    const existing = agentConfig.mcpServers[name] ?? {};
    agentConfig.mcpServers[name] = {
      ...existing,
      ...server,
    };
  }

  return agentConfig;
}
