import { describe, expect, test } from "bun:test";
import { updateTomlValues } from "@shopify/toml-patch";
import type { Config } from "../config";
import { buildPatches, mergeConfig } from "./codex-cli";

describe("mergeConfig", () => {
  type Case = [title: string, input: string, config: Config, expected: string];

  const cases: Case[] = [
    [
      "insert into empty file (with env)",
      "",
      {
        agents: ["codex-cli"],
        mcpServers: {
          context7: {
            command: "npx",
            args: ["-y", "@upstash/context7-mcp@latest"],
            env: { API_KEY: "value" },
          },
        },
      },
      [
        "[mcp_servers.context7]",
        'command = "npx"',
        'args = ["-y", "@upstash/context7-mcp@latest"]',
        "",
        "[mcp_servers.context7.env]",
        'API_KEY = "value"',
        "",
      ].join("\n"),
    ],
    [
      "preserves other sections and appends new server",
      ["# header", "[other.section]", "x = 1", ""].join("\n"),
      {
        agents: [],
        mcpServers: {
          ctx: { command: "npx", args: [], env: {} },
        },
      },
      [
        "# header",
        "[other.section]",
        "x = 1",
        "",
        "[mcp_servers.ctx]",
        'command = "npx"',
        "args = []",
        "",
      ].join("\n"),
    ],
    [
      "updates existing server and keeps unknown keys",
      [
        "[mcp_servers.context7]",
        'command = "old"',
        'args = ["-x"]',
        'other = "stay"',
        "",
      ].join("\n"),
      {
        agents: [],
        mcpServers: {
          context7: { command: "npx", args: ["-y"], env: {} },
        },
      },
      [
        "[mcp_servers.context7]",
        'command = "npx"',
        'args = ["-y"]',
        'other = "stay"',
        "",
      ].join("\n"),
    ],
    [
      "quoted section names are handled",
      ['[mcp_servers."name.with dot"]', 'command = "old"', ""].join("\n"),
      {
        agents: [],
        mcpServers: {
          "name.with dot": { command: "new", args: [], env: {} },
        },
      },
      [
        '[mcp_servers."name.with dot"]',
        'command = "new"',
        "args = []",
        "",
      ].join("\n"),
    ],
    [
      "empty servers results in no change",
      "# nothing\n",
      { agents: [], mcpServers: {} },
      "# nothing\n",
    ],
  ];

  test.each(cases)("%s", (_title, input, config, expected) => {
    const out = mergeConfig(input, config);
    expect(out).toEqual(expected);
  });
});

describe("buildPatches", () => {
  type Case = [title: string, input: string, config: Config, expected: string];

  const cases: Case[] = [
    [
      "inserts unknown scalar keys and arrays",
      "",
      {
        agents: [],
        mcpServers: {
          svc: {
            command: "npx",
            args: ["-y"],
            extras: "ok",
            extensions: ["a", "b"],
          },
        },
      },
      [
        "[mcp_servers.svc]",
        'command = "npx"',
        'args = ["-y"]',
        'extras = "ok"',
        'extensions = ["a", "b"]',
        "",
      ].join("\n"),
    ],
    [
      "adds nested object tables",
      "",
      {
        agents: [],
        mcpServers: {
          svc: {
            command: "bin",
            extras: { tokens: 123, flags: { debug: true } },
          },
        },
      },
      [
        "[mcp_servers.svc]",
        'command = "bin"',
        "",
        "[mcp_servers.svc.extras]",
        "tokens = 123",
        "",
        "[mcp_servers.svc.extras.flags]",
        "debug = true",
        "",
      ].join("\n"),
    ],
    [
      "clears a key when value is undefined",
      ["[mcp_servers.ctx]", 'command = "old"', 'other = "remove"', ""].join(
        "\n",
      ),
      {
        agents: [],
        mcpServers: {
          ctx: { command: "new", other: undefined },
        },
      },
      ["[mcp_servers.ctx]", 'command = "new"', ""].join("\n"),
    ],
    [
      "updates env and appends new values",
      [
        "[mcp_servers.svc]",
        'command = "npx"',
        "",
        "[mcp_servers.svc.env]",
        'A = "1"',
        "",
      ].join("\n"),
      {
        agents: [],
        mcpServers: {
          svc: { args: [], env: { A: "x", B: "2" } },
        },
      },
      [
        "[mcp_servers.svc]",
        'command = "npx"',
        "args = []",
        "",
        "[mcp_servers.svc.env]",
        'A = "x"',
        'B = "2"',
        "",
      ].join("\n"),
    ],
    [
      "quoted section names are handled",
      "",
      {
        agents: [],
        mcpServers: {
          "name.with dot": { url: "http://localhost:3333" },
        },
      },
      [
        '[mcp_servers."name.with dot"]',
        'url = "http://localhost:3333"',
        "",
      ].join("\n"),
    ],
    [
      "url only server",
      "# nothing\n",
      {
        agents: [],
        mcpServers: { only: { url: "http://127.0.0.1:8080" } },
      },
      [
        "[mcp_servers.only]",
        'url = "http://127.0.0.1:8080"',
        "# nothing",
        "",
      ].join("\n"),
    ],
  ];

  test.each(cases)("%s", (_title, input, cfg, expected) => {
    const patches = buildPatches(cfg);
    const out = updateTomlValues(input, patches);
    expect(out).toEqual(expected);
  });
});
