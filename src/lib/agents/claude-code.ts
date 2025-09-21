import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Config } from "../config";
import type { AgentAdapter, ApplyConfigOptions } from "./adapter";

export type ClaudeCodeConfig = {
  mcpServers?: {
    [name: string]: unknown;
  };
  [key: string]: unknown;
};

export class ClaudeCodeAgent implements AgentAdapter {
  readonly id = "claude-code" as const;

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
    return path.join(home, ".claude.json");
  }

  private _loadConfig(): ClaudeCodeConfig {
    const pathname = this.configPath();
    if (!fs.existsSync(pathname)) {
      return { mcpServers: {} };
    }
    const content = fs.readFileSync(pathname, "utf-8");
    return JSON.parse(content);
  }

  private _saveConfig(config: ClaudeCodeConfig): void {
    const pathname = this.configPath();
    const content = `${JSON.stringify(config, null, 2)}\n`;
    fs.writeFileSync(pathname, content, "utf-8");
  }
}

export function replaceConfig(
  agentConfig: ClaudeCodeConfig,
  config: Config,
): ClaudeCodeConfig {
  const entries = Object.entries(config.mcpServers);
  const next: ClaudeCodeConfig = { ...agentConfig };

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
  agentConfig: ClaudeCodeConfig,
  config: Config,
): ClaudeCodeConfig {
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
