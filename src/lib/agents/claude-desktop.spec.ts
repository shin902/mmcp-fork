import { describe, expect, test } from "bun:test";
import type { Config } from "../config";
import type { ClaudeDesktopConfig } from "./claude-desktop";
import { mergeConfig, replaceConfig } from "./claude-desktop";

describe("mergeConfig (claude-desktop)", () => {
  type Case = [
    title: string,
    agentConfig: ClaudeDesktopConfig,
    mmcp: Config,
    expected: ClaudeDesktopConfig,
  ];

  const cases: Case[] = [
    [
      "inserts new server into empty agent config",
      {},
      {
        agents: ["claude-desktop"],
        mcpServers: {
          context7: {
            command: "npx",
            args: ["-y", "@upstash/context7-mcp@latest"],
            env: {},
          },
        },
        templates: {},
      },
      {
        mcpServers: {
          context7: {
            command: "npx",
            args: ["-y", "@upstash/context7-mcp@latest"],
            env: {},
          },
        },
      },
    ],
    [
      "preserves other top-level keys and existing servers",
      {
        theme: "dark",
        mcpServers: {
          foo: { command: "node", args: ["foo.js"], env: { A: "1" } },
        },
      },
      {
        agents: [],
        mcpServers: {
          ctx: { command: "npx", args: [], env: {} },
        },
        templates: {},
      },
      {
        theme: "dark",
        mcpServers: {
          foo: { command: "node", args: ["foo.js"], env: { A: "1" } },
          ctx: { command: "npx", args: [], env: {} },
        },
      },
    ],
    [
      "overwrites existing server and keeps unknown keys under that server",
      {
        mcpServers: {
          context7: { command: "old", args: ["-x"], env: {}, other: "stay" },
        },
      },
      {
        agents: [],
        mcpServers: {
          context7: { command: "npx", args: ["-y"], env: {} },
        },
        templates: {},
      },
      {
        mcpServers: {
          context7: { command: "npx", args: ["-y"], env: {}, other: "stay" },
        },
      },
    ],
    [
      "supports names with dot and space",
      { mcpServers: {} },
      {
        agents: [],
        mcpServers: {
          "name.with dot": { command: "npx", args: [], env: { K: "V" } },
        },
        templates: {},
      },
      {
        mcpServers: {
          "name.with dot": { command: "npx", args: [], env: { K: "V" } },
        },
      },
    ],
    [
      "empty mmcp servers results in no change",
      { mcpServers: { keep: { command: "x", args: [], env: {} } } },
      { agents: [], mcpServers: {}, templates: {} },
      { mcpServers: { keep: { command: "x", args: [], env: {} } } },
    ],
  ];

  test.each(cases)("%s", (_title, agentConfig, mmcp, expected) => {
    const out = mergeConfig(structuredClone(agentConfig), mmcp);
    expect(out).toEqual(expected);
  });
});

describe("replaceConfig (claude-desktop)", () => {
  test("replaces existing servers with the provided subset", () => {
    const agentConfig: ClaudeDesktopConfig = {
      settings: { theme: "dark" },
      mcpServers: {
        stale: { command: "node", args: ["old.js"], env: {} },
        keep: { command: "stay", args: [], env: {} },
      },
    };
    const mmcp: Config = {
      agents: [],
      mcpServers: {
        keep: { command: "stay", args: [], env: {} },
      },
      templates: {},
    };
    const out = replaceConfig(structuredClone(agentConfig), mmcp);
    expect(out).toEqual({
      settings: { theme: "dark" },
      mcpServers: {
        keep: { command: "stay", args: [], env: {} },
      },
    });
  });

  test("removes mcpServers when empty subset is provided", () => {
    const agentConfig: ClaudeDesktopConfig = {
      path: "config",
      mcpServers: {
        stale: { command: "node", args: [], env: {} },
      },
    };
    const mmcp: Config = { agents: [], mcpServers: {}, templates: {} };
    const out = replaceConfig(structuredClone(agentConfig), mmcp);
    expect(out).toEqual({ path: "config" });
  });
});
