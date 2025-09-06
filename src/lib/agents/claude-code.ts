import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Config } from "../config";
import type { AgentAdapter } from "./adapter";

type ClaudeCodeConfig = {
  mcpServers?: {
    [name: string]: unknown;
  };
  [key: string]: unknown;
};

export class ClaudeCodeAgent implements AgentAdapter {
  readonly id = "claude-code" as const;

  applyConfig(config: Config): void {
    const agentConfig = this._loadConfig();
    if (!agentConfig.mcpServers) {
      agentConfig.mcpServers = {};
    }

    for (const [name, server] of Object.entries(config.mcpServers)) {
      agentConfig.mcpServers[name] = {
        command: server.command,
        args: server.args,
        env: server.env,
      };
    }

    this._saveConfig(agentConfig);
  }

  private _configPath(): string {
    const home = os.homedir();
    return path.join(home, ".claude.json");
  }

  private _loadConfig(): ClaudeCodeConfig {
    const pathname = this._configPath();
    if (!fs.existsSync(pathname)) {
      return { mcpServers: {} };
    }
    const content = fs.readFileSync(pathname, "utf-8");
    return JSON.parse(content);
  }

  private _saveConfig(config: ClaudeCodeConfig): void {
    const pathname = this._configPath();
    const content = `${JSON.stringify(config, null, 2)}\n`;
    fs.writeFileSync(pathname, content, "utf-8");
  }
}
