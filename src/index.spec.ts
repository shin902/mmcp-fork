import { describe, expect, test } from "bun:test";

const decoder = new TextDecoder();

describe("CLI entrypoint", () => {
  test.each([
    {
      command: "add",
      message:
        "mmcp add は削除されました。設定ファイル (~/.mmcp.json) を直接編集してください。",
    },
    {
      command: "remove",
      message:
        "mmcp remove は削除されました。サーバー定義を削除する場合は ~/.mmcp.json を直接編集してください。",
    },
  ])("mmcp %s reports removal message", ({ command, message }) => {
    const result = Bun.spawnSync({
      cmd: ["bun", "src/index.ts", command],
      stderr: "pipe",
      stdout: "pipe",
      env: {
        ...process.env,
        NO_COLOR: "1",
      },
    });

    expect(result.exitCode).toBe(1);
    expect(decoder.decode(result.stdout)).toBe("");
    expect(decoder.decode(result.stderr).trim()).toBe(message);
  });
});
