import type { Config } from "../lib/config";

export type ServerFilterOptions = {
  servers: string[];
  exclude: string[];
  reset: boolean;
  allowEmpty: boolean;
};

export type ServerFilterInput = ServerFilterOptions & {
  template?: string;
};

export function resolveServerFilters(
  config: Config,
  input: ServerFilterInput,
): ServerFilterOptions {
  const { template } = input;
  let mergedServers = [...input.servers];
  let mergedExclude = [...input.exclude];

  if (template) {
    const templateDef = config.templates[template];
    if (!templateDef) {
      throw new Error(`Template not found: ${template}.`);
    }

    if (templateDef.servers) {
      if (mergedExclude.length > 0) {
        throw new Error(
          "Template provides servers, but --exclude is also specified.",
        );
      }
      mergedServers = mergeUnique(templateDef.servers, mergedServers);
      mergedExclude = [];
    } else if (templateDef.exclude) {
      if (mergedServers.length > 0) {
        throw new Error(
          "Template provides exclude, but --servers is also specified.",
        );
      }
      mergedExclude = mergeUnique(templateDef.exclude, mergedExclude);
      mergedServers = [];
    } else {
      throw new Error(
        `Template ${template} must define either servers or exclude.`,
      );
    }
  }

  return {
    servers: mergedServers,
    exclude: mergedExclude,
    reset: input.reset,
    allowEmpty: input.allowEmpty,
  };
}

function mergeUnique(primary: string[], secondary: string[]): string[] {
  if (primary.length === 0 && secondary.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of primary) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  for (const name of secondary) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

export function resolveTargetServers(
  config: Config,
  options: ServerFilterOptions,
): Config["mcpServers"] {
  const { servers, exclude, reset, allowEmpty } = options;

  if (servers.length > 0 && exclude.length > 0) {
    throw new Error("Cannot use --servers and --exclude together.");
  }

  if (allowEmpty && !reset) {
    throw new Error("--allow-empty can only be used with --reset.");
  }

  if (reset && servers.length === 0 && exclude.length === 0) {
    throw new Error("Cannot use --reset without --servers or --exclude.");
  }

  const allEntries = Object.entries(config.mcpServers) as Array<
    [string, Config["mcpServers"][string]]
  >;
  let selectedEntries: Array<[string, Config["mcpServers"][string]]>;

  if (servers.length > 0) {
    if (servers.includes("ALL")) {
      selectedEntries = [...allEntries];
    } else {
      const seen = new Set<string>();
      selectedEntries = [];
      for (const name of servers) {
        if (seen.has(name)) {
          continue;
        }
        seen.add(name);
        const server = config.mcpServers[name];
        if (server) {
          selectedEntries.push([name, server]);
        }
      }
    }
  } else if (exclude.length > 0) {
    if (exclude.includes("ALL")) {
      selectedEntries = [];
    } else {
      const excludeSet = new Set(exclude);
      selectedEntries = allEntries.filter(([name]) => !excludeSet.has(name));
    }
  } else {
    selectedEntries = [...allEntries];
  }

  if (selectedEntries.length === 0) {
    if (reset) {
      if (!allowEmpty) {
        throw new Error(
          "Reset operation would result in empty configuration. Use --allow-empty to proceed.",
        );
      }
    } else {
      throw new Error(
        "No target servers to apply. Use --servers or --exclude.",
      );
    }
  }

  const next: Config["mcpServers"] = {};
  for (const [name, server] of selectedEntries) {
    next[name] = server;
  }

  return next;
}
