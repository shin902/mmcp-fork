import { describe, expect, test } from "bun:test";
import type { Config } from "../lib/config";
import {
  resolveServerFilters,
  resolveTargetServers,
  type ServerFilterInput,
  type ServerFilterOptions,
} from "./apply-targets";

const baseConfig: Config = {
  agents: ["claude-code"],
  mcpServers: {
    context7: { command: "npx", args: ["-y"], env: {} },
    everything: { command: "bun", args: ["run", "start"], env: {} },
    extra: { command: "node", args: ["extra.js"], env: {} },
  },
  templates: {},
};

const defaults = (): ServerFilterOptions => ({
  servers: [],
  exclude: [],
  reset: false,
  allowEmpty: false,
});

const inputDefaults = (): ServerFilterInput => ({
  ...defaults(),
  template: undefined,
});

describe("resolveServerFilters", () => {
  test("merges template servers with CLI servers", () => {
    const config: Config = {
      ...baseConfig,
      templates: {
        dev: { servers: ["context7", "everything"] },
      },
    };
    const out = resolveServerFilters(config, {
      ...inputDefaults(),
      template: "dev",
      servers: ["extra", "context7"],
    });
    expect(out).toEqual({
      servers: ["context7", "everything", "extra"],
      exclude: [],
      reset: false,
      allowEmpty: false,
    });
  });

  test("merges template exclude with CLI exclude", () => {
    const config: Config = {
      ...baseConfig,
      templates: {
        minimal: { exclude: ["extra"] },
      },
    };
    const out = resolveServerFilters(config, {
      ...inputDefaults(),
      template: "minimal",
      exclude: ["context7"],
    });
    expect(out).toEqual({
      servers: [],
      exclude: ["extra", "context7"],
      reset: false,
      allowEmpty: false,
    });
  });

  test("throws when template is missing", () => {
    expect(() =>
      resolveServerFilters(baseConfig, {
        ...inputDefaults(),
        template: "missing",
      }),
    ).toThrowError("Template not found: missing.");
  });

  test("throws when template servers combine with CLI exclude", () => {
    const config: Config = {
      ...baseConfig,
      templates: {
        dev: { servers: ["context7"] },
      },
    };
    expect(() =>
      resolveServerFilters(config, {
        ...inputDefaults(),
        template: "dev",
        exclude: ["extra"],
      }),
    ).toThrowError("Template provides servers, but --exclude is also specified.");
  });

  test("throws when template exclude combines with CLI servers", () => {
    const config: Config = {
      ...baseConfig,
      templates: {
        minimal: { exclude: ["extra"] },
      },
    };
    expect(() =>
      resolveServerFilters(config, {
        ...inputDefaults(),
        template: "minimal",
        servers: ["context7"],
      }),
    ).toThrowError("Template provides exclude, but --servers is also specified.");
  });
});

describe("resolveTargetServers", () => {
  test("returns all servers when no filters are provided", () => {
    const out = resolveTargetServers(baseConfig, defaults());
    expect(out).toEqual(baseConfig.mcpServers);
  });

  test("selects only the requested servers in order", () => {
    const out = resolveTargetServers(baseConfig, {
      ...defaults(),
      servers: ["everything", "context7"],
    });
    const context7 = baseConfig.mcpServers.context7;
    const everything = baseConfig.mcpServers.everything;
    if (!context7 || !everything) {
      throw new Error("invalid test setup: missing base servers");
    }
    expect(out).toEqual({
      everything,
      context7,
    });
  });

  test("ignores duplicates and unknown server names", () => {
    const out = resolveTargetServers(baseConfig, {
      ...defaults(),
      servers: ["context7", "missing", "context7"],
    });
    const context7 = baseConfig.mcpServers.context7;
    if (!context7) {
      throw new Error("invalid test setup: missing base servers");
    }
    expect(out).toEqual({ context7 });
  });

  test("treats ALL keyword as selecting every server", () => {
    const out = resolveTargetServers(baseConfig, {
      ...defaults(),
      servers: ["ALL"],
    });
    expect(out).toEqual(baseConfig.mcpServers);
  });

  test("applies exclusion list", () => {
    const out = resolveTargetServers(baseConfig, {
      ...defaults(),
      exclude: ["extra"],
    });
    const context7 = baseConfig.mcpServers.context7;
    const everything = baseConfig.mcpServers.everything;
    if (!context7 || !everything) {
      throw new Error("invalid test setup: missing base servers");
    }
    expect(out).toEqual({
      context7,
      everything,
    });
  });

  test("throws when both servers and exclude are provided", () => {
    expect(() =>
      resolveTargetServers(baseConfig, {
        ...defaults(),
        servers: ["context7"],
        exclude: ["extra"],
      }),
    ).toThrowError("Cannot use --servers and --exclude together.");
  });

  test("throws when reset is used without filters", () => {
    expect(() =>
      resolveTargetServers(baseConfig, { ...defaults(), reset: true }),
    ).toThrowError("Cannot use --reset without --servers or --exclude.");
  });

  test("throws when allow-empty is used without reset", () => {
    expect(() =>
      resolveTargetServers(baseConfig, { ...defaults(), allowEmpty: true }),
    ).toThrowError("--allow-empty can only be used with --reset.");
  });

  test("throws when selection is empty without reset", () => {
    expect(() =>
      resolveTargetServers(baseConfig, {
        ...defaults(),
        exclude: ["ALL"],
      }),
    ).toThrowError("No target servers to apply. Use --servers or --exclude.");
  });

  test("throws when reset would empty selection without allow-empty", () => {
    expect(() =>
      resolveTargetServers(baseConfig, {
        ...defaults(),
        reset: true,
        servers: ["missing"],
      }),
    ).toThrowError(
      "Reset operation would result in empty configuration. Use --allow-empty to proceed.",
    );
  });

  test("allows empty selection when reset and allow-empty are set", () => {
    const out = resolveTargetServers(baseConfig, {
      ...defaults(),
      reset: true,
      allowEmpty: true,
      exclude: ["ALL"],
    });
    expect(out).toEqual({});
  });
});
