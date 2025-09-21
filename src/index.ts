import { Argument, Command, CommanderError, Option } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { agentsAddCommand } from "./commands/agents-add";
import { agentsListCommand } from "./commands/agents-list";
import { agentsRemoveCommand } from "./commands/agents-remove";
import { applyCommand } from "./commands/apply";
import { listCommand } from "./commands/list";
import { supportedAgentIds } from "./lib/agents/registry";
import { defaultConfigPath } from "./lib/config";

const program = new Command();

const errorBuffer: string[] = [];

program.configureOutput({
  writeErr: (str) => {
    errorBuffer.push(str);
  },
  writeOut: (str) => {
    process.stdout.write(str);
  },
});

program.exitOverride();

program
  .name("mmcp")
  .version(packageJson.version)
  .description(
    "Manage your MCP (Model Context Protocol) server definitions in one place and apply them to supported agents.",
  );

program
  .command("apply")
  .description("Apply mmcp config to an agent")
  .addOption(
    new Option("--agents <name...>", "Target agents").choices(
      supportedAgentIds(),
    ),
  )
  .option("--servers <name...>", "Apply only the specified servers")
  .option("--exclude <name...>", "Exclude the specified servers")
  .option("--template <name>", "Apply filters defined in template")
  .option("--reset", "Reset target agents to only the selected servers", false)
  .option("--allow-empty", "Allow reset to remove all servers", false)
  .option("-c, --config <path>", "Path to config file", defaultConfigPath())
  .action(
    (options: {
      agents?: string[];
      servers?: string[];
      exclude?: string[];
      template?: string;
      reset?: boolean;
      allowEmpty?: boolean;
      config: string;
    }) => {
      applyCommand({
        agents: options.agents ?? [],
        configPath: options.config,
        servers: options.servers ?? [],
        exclude: options.exclude ?? [],
        template: options.template,
        reset: options.reset ?? false,
        allowEmpty: options.allowEmpty ?? false,
      });
    },
  );

program
  .command("list")
  .description("List configured mcp servers")
  .option("-c, --config <path>", "Path to config file", defaultConfigPath())
  .option("--json", "Output mcpServers as JSON", false)
  .action((options: { config: string; json: boolean }) => {
    listCommand({ configPath: options.config, json: options.json });
  });

// agents subcommands
const agents = program
  .command("agents")
  .description("Manage apply target agents");

agents
  .command("add")
  .description("Add apply target agents")
  .addArgument(
    new Argument("<name...>", "Agent names").choices(supportedAgentIds()),
  )
  .option("-c, --config <path>", "Path to config file", defaultConfigPath())
  .action((names: string[], options: { config: string }) => {
    agentsAddCommand({ names, configPath: options.config });
  });

agents
  .command("remove")
  .description("Remove apply target agents")
  .addArgument(
    new Argument("<name...>", "Agent names").choices(supportedAgentIds()),
  )
  .option("-c, --config <path>", "Path to config file", defaultConfigPath())
  .action((names: string[], options: { config: string }) => {
    agentsRemoveCommand({ names, configPath: options.config });
  });

agents
  .command("list")
  .description("List registered apply target agents")
  .option("-c, --config <path>", "Path to config file", defaultConfigPath())
  .option("--json", "Output agents as JSON", false)
  .action((options: { config: string; json: boolean }) => {
    agentsListCommand({ configPath: options.config, json: options.json });
  });

program.parseAsync(process.argv).catch((err) => {
  if (err instanceof CommanderError) {
    if (err.code === "commander.unknownCommand") {
      const message = err.message;
      if (message.includes("'add'")) {
        errorBuffer.length = 0;
        console.error(
          "mmcp add は削除されました。設定ファイル (~/.mmcp.json) を直接編集してください。",
        );
      } else if (message.includes("'remove'")) {
        errorBuffer.length = 0;
        console.error(
          "mmcp remove は削除されました。サーバー定義を削除する場合は ~/.mmcp.json を直接編集してください。",
        );
      } else {
        if (errorBuffer.length > 0) {
          console.error(errorBuffer.join(""));
          errorBuffer.length = 0;
        } else {
          console.error(err.message);
        }
      }
    } else {
      if (errorBuffer.length > 0) {
        console.error(errorBuffer.join(""));
        errorBuffer.length = 0;
      } else {
        console.error(err.message);
      }
    }
    process.exit(err.exitCode);
    return;
  }

  if (errorBuffer.length > 0) {
    console.error(errorBuffer.join(""));
    errorBuffer.length = 0;
  }

  if (process.env.DEBUG === "true") {
    console.error(err);
  } else {
    console.error(String(err));
  }
  process.exit(1);
});
