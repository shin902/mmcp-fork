import type { Config } from "../config";

export type ApplyConfigOptions = {
  reset?: boolean;
};

export interface AgentAdapter {
  readonly id: string;
  applyConfig(config: Config, options?: ApplyConfigOptions): void;
  configPath(): string;
}
