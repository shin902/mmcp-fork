# mmcp

[![NPM Version](https://img.shields.io/npm/v/mmcp)](https://www.npmjs.com/package/mmcp)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/koki-develop/mmcp/release-please.yml)](https://github.com/koki-develop/mmcp/actions/workflows/release-please.yml)
[![GitHub License](https://img.shields.io/github/license/koki-develop/mmcp)](./LICENSE)

mmcp は Model Context Protocol (MCP) サーバー定義を 1 つの JSON 設定に集約し、対応エージェントの設定へ同期する CLI です。現状実装されているコマンドに合わせて使い方を整理しています。

## 主な機能
- サーバー定義と適用対象エージェントを `~/.mmcp.json` で集中管理
- `mmcp apply` で複数エージェントへ設定を適用（フィルタ、テンプレート、リセットに対応）
- `mmcp list` で登録済みサーバーを確認（テキスト / JSON 出力）
- `mmcp agents` サブコマンドで適用対象エージェントの追加・削除・一覧を実行

## 対応エージェント

| エージェント | ID | 設定ファイル |
| --- | --- | --- |
| [Claude Code](https://www.anthropic.com/claude-code) | `claude-code` | `~/.claude.json` |
| [Claude Desktop](https://claude.ai/download) | `claude-desktop` | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`<br>Windows: `%APPDATA%\Claude\claude_desktop_config.json`<br>Linux: `~/.config/Claude/claude_desktop_config.json` |
| [Codex CLI](https://developers.openai.com/codex/cli) | `codex-cli` | `~/.codex/config.toml` |
| [Cursor](https://docs.cursor.com/) | `cursor` | `~/.cursor/mcp.json` |
| [Gemini CLI](https://google-gemini.github.io/gemini-cli/) | `gemini-cli` | `~/.gemini/settings.json` |

## インストール

```bash
npm install -g mmcp
```

## Development Quick Start

```bash
bun install
bun run build
bun src/index.ts --help
```

## 設定ファイル (`~/.mmcp.json`)

サーバー定義 (`mcpServers`) と適用対象エージェント (`agents`)、テンプレート (`templates`) を 1 つの JSON ファイルで管理します。存在しない場合はコマンド実行時に空設定として扱われます。

```json
{
  "agents": ["claude-code", "claude-desktop"],
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    },
    "filesystem": {
      "command": "bun",
      "args": ["run", "start"],
      "env": {}
    }
  },
  "templates": {
    "dev": {
      "servers": ["context7", "filesystem"]
    },
    "minimal": {
      "exclude": ["filesystem"]
    }
  }
}
```

- `agents`: `mmcp apply` を実行する際のデフォルト対象。コマンド引数で上書き可能です。
- `mcpServers`: サーバー名ごとの定義。`command` / `args` / `env` / `url` のいずれかを組み合わせて記述します。
- `templates`: `--template` で呼び出すフィルタプリセット（`servers` または `exclude` のどちらか片方を必須指定）。
- サーバー定義を追加・削除する CLI は提供していません。必要に応じて JSON を直接編集してください。

## コマンド

### サーバー一覧: `mmcp list`

```bash
mmcp list [--config <path>] [--json]
```

- `--json`: `mcpServers` を JSON 形式でそのまま出力します。
- `--config`: 既定以外の設定ファイルを参照する場合に使用します。

### 設定適用: `mmcp apply`

```bash
mmcp apply \
  [--agents <id...>] \
  [--servers <name...>] \
  [--exclude <name...>] \
  [--template <name>] \
  [--reset] [--allow-empty] \
  [--config <path>]
```

- `--agents`: 適用するエージェント ID を明示します（省略時は設定ファイル内の `agents`）。
- `--servers`: 指定したサーバーのみ適用します。`ALL` を含めると全件選択になります。
- `--exclude`: 指定したサーバーを除外して適用します。
- `--template`: 設定ファイルのテンプレート定義を読み込み、`servers` または `exclude` を適用します。
- `--reset`: 対象エージェントの既存サーバー定義を置き換え、選択したサーバーのみを残します。
- `--allow-empty`: `--reset` と併用することで、結果的にサーバー定義が空になる操作を許可します。
- `--config`: 使用する設定ファイルを切り替えます。

利用時の注意:
- `--servers` と `--exclude` は同時に指定できません。
- テンプレート内で `servers` を定義している場合は `--exclude` を、`exclude` を定義している場合は `--servers` を併用できません。
- `--reset` 単体では実行できません。`--servers` もしくは `--exclude` と組み合わせてください。
- 適用対象が 0 件になる場合はエラーになります。どうしても空にしたい場合は `--reset --allow-empty` を指定します。

部分適用の詳細な挙動は `docs/partial-apply-spec.md` を参照してください。

### エージェント管理: `mmcp agents`

```bash
mmcp agents add <id...> [--config <path>]
mmcp agents remove <id...> [--config <path>]
mmcp agents list [--config <path>] [--json]
```

- `add`: 設定ファイルの `agents` に ID を追加します（既存 ID は重複登録されません）。
- `remove`: 設定ファイルの `agents` から ID を削除します。未登録 ID を指定するとエラーになります。
- `list`: 現在登録済みのエージェントを表示します。`--json` で `{ "agents": [...] }` を出力します。
- いずれのサブコマンドも `--config` で別パスの設定ファイルを扱えます。

## ローカル開発

このリポジトリは Bun を利用しています。開発時は以下を実行してください。

```bash
bun install
bun run lint
bun run fmt
bun run typecheck
bun run build
bun test
```

## ライセンス

[MIT](./LICENSE)
