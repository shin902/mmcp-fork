import chalk from "chalk";
import ora from "ora";
import { getAgentById, supportedAgentIds } from "../lib/agents/registry";
import type { Config } from "../lib/config";
import { loadConfig } from "../lib/config";
import {
  resolveServerFilters,
  resolveTargetServers,
  type ServerFilterInput,
} from "./apply-targets";

export type ApplyCommandParams = {
  agents: string[];
  configPath: string;
} & ServerFilterInput;

export function applyCommand(params: ApplyCommandParams) {
  const config = loadConfig({ path: params.configPath });

  const agentIds = (() => {
    if (params.agents.length > 0) return params.agents;
    return config.agents;
  })();
  if (agentIds.length === 0) {
    throw new Error(
      "No target agents specified. Use --agents or set agents in mmcp config.",
    );
  }

  const supported = supportedAgentIds();
  const unsupported = agentIds.filter((id) => !supported.includes(id));
  if (unsupported.length > 0) {
    throw new Error(`Unsupported agents: ${unsupported.join(", ")}.`);
  }

  const filters = resolveServerFilters(config, {
    template: params.template,
    servers: params.servers,
    exclude: params.exclude,
    reset: params.reset,
    allowEmpty: params.allowEmpty,
  });

  const targetServers = resolveTargetServers(config, filters);
  const targetConfig: Config = { ...config, mcpServers: targetServers };

  const adapters = agentIds.map((id) => getAgentById(id));
  for (const adapter of adapters) {
    const spinner = ora().start(`Applying config: ${adapter.id}...`);
    const options = params.reset ? { reset: true } : undefined;
    adapter.applyConfig(targetConfig, options);
    spinner.succeed(`${adapter.id} ${chalk.dim(adapter.configPath())}`);
  }
}
