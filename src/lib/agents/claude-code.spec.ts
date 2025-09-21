import { describe, expect, test } from "bun:test";
import type { Config } from "../config";
import type { ClaudeCodeConfig } from "./claude-code";
import { mergeConfig, replaceConfig } from "./claude-code";

describe("mergeConfig (claude-code)", () => {
  type Case = [
    title: string,
    agentConfig: ClaudeCodeConfig,
    mmcp: Config,
    expected: ClaudeCodeConfig,
  ];

  const cases: Case[] = [
    [
      "inserts new server into empty agent config",
      {},
      {
        agents: ["claude-code"],
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
  ];

  test.each(cases)("%s", (_title, agentConfig, mmcp, expected) => {
    const out = mergeConfig(structuredClone(agentConfig), mmcp);
    expect(out).toEqual(expected);
  });
});

describe("replaceConfig (claude-code)", () => {
  test("replaces existing servers with the provided subset", () => {
    const agentConfig: ClaudeCodeConfig = {
      theme: "dark",
      mcpServers: {
        old: { command: "node", args: ["old.js"], env: {} },
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
      theme: "dark",
      mcpServers: {
        keep: { command: "stay", args: [], env: {} },
      },
    });
  });

  test("removes mcpServers when the subset is empty", () => {
    const agentConfig: ClaudeCodeConfig = {
      feature: true,
      mcpServers: {
        remove: { command: "rm", args: [], env: {} },
      },
    };
    const mmcp: Config = { agents: [], mcpServers: {}, templates: {} };
    const out = replaceConfig(structuredClone(agentConfig), mmcp);
    expect(out).toEqual({ feature: true });
  });
});
