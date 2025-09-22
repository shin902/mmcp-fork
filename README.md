# mmcp

[![NPM Version](https://img.shields.io/npm/v/mmcp)](https://www.npmjs.com/package/mmcp)
[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/koki-develop/mmcp/release-please.yml)](https://github.com/koki-develop/mmcp/actions/workflows/release-please.yml)
[![GitHub License](https://img.shields.io/github/license/koki-develop/mmcp)](./LICENSE)

Model Context Protocol (MCP) サーバーを一元管理し、複数のAIエージェントに同期するCLIツールです。

> **📖 詳しい使い方については[こちらの記事](https://zenn.dev/kou_pg_0131/articles/mmcp-introduction)をご覧ください**

## 概要

mmcpは、MCPサーバーの設定を`~/.mmcp.json`で集中管理し、`mmcp apply`コマンドで対応するAIエージェントの設定ファイルに自動同期します。複数のエージェントでMCPサーバーを統一管理したい場合・MCPサーバーを選択して適用する場合に便利です。

## セットアップ

### 色々インストール
```bash
bun install
```

### ヘルプを表示
```bash
bun run src/index.ts --help
```

## クイックスタート

```bash
# エージェントの追加
mmcp agents add claude-code claude-desktop

# MCPサーバーの追加
mmcp add -- context7 npx -y @upstash/context7-mcp@latest
mmcp add -- everything npx -y @modelcontextprotocol/server-everything@latest

# 現在の設定を確認
mmcp list

# 設定を各エージェントに適用
mmcp apply
```

## 対応エージェント

| エージェント | ID | 設定ファイル |
|-------------|----|-----------|
| [Claude Code](https://www.anthropic.com/claude-code) | `claude-code` | `~/.claude.json` |
| [Claude Desktop](https://claude.ai/download) | `claude-desktop` | プラットフォーム固有パス※ |
| [Codex CLI](https://developers.openai.com/codex/cli) | `codex-cli` | `~/.codex/config.toml` |
| [Cursor](https://docs.cursor.com/) | `cursor` | `~/.cursor/mcp.json` |
| [Gemini CLI](https://google-gemini.github.io/gemini-cli/) | `gemini-cli` | `~/.gemini/settings.json` |

※ Claude Desktop設定パス:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

## 設定ファイル

`~/.mmcp.json`でサーバー定義、対象エージェント、テンプレートを管理します：

```json
{
  "agents": ["claude-code", "claude-desktop"],
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key"
      }
    }
  },
  "templates": {
    "dev": {
      "servers": ["filesystem", "brave-search"]
    },
    "minimal": {
      "exclude": ["brave-search"]
    }
  }
}
```

### 設定項目

- **`agents`**: デフォルトの適用対象エージェント
- **`mcpServers`**: サーバー定義（`command`/`args`/`env`/`url`を組み合わせ）
- **`templates`**: フィルタープリセット（`servers`または`exclude`のいずれかを指定）

## コマンド

### `mmcp add` - サーバー追加

```bash
mmcp add [--env KEY=VALUE ...] [--config <path>] [--force] -- <name> <command> [args...]
```

MCPサーバーを設定に追加します。

**引数:**
- `<name>`: サーバー名
- `<command>`: 実行コマンド
- `[args...]`: コマンド引数

**オプション:**
- `-e, --env <key=value...>`: 環境変数を設定
- `-f, --force`: 既存サーバーを上書き
- `-c, --config <path>`: 設定ファイルのパスを指定

**例:**
```bash
# 基本的な追加
mmcp add -- context7 npx -y @upstash/context7-mcp@latest
mmcp add -- everything npx -y @modelcontextprotocol/server-everything@latest

# 環境変数付きで追加
mmcp add -e BRAVE_API_KEY=your-key -- brave-search npx -y @modelcontextprotocol/server-brave-search

# 強制上書き
mmcp add --force -- filesystem npx -y @modelcontextprotocol/server-filesystem
```

### `mmcp remove` - サーバー削除

```bash
mmcp remove <name> [options]
```

MCPサーバーを設定から削除します。

**引数:**
- `<name>`: 削除するサーバー名

**オプション:**
- `-c, --config <path>`: 設定ファイルのパスを指定

**例:**
```bash
mmcp remove filesystem
mmcp rm brave-search  # rmエイリアスも使用可能
```

### `mmcp list` - サーバー一覧

```bash
mmcp list [options]
```

**オプション:**
- `--json`: JSON形式で出力
- `--config <path>`: 設定ファイルのパスを指定

### `mmcp apply` - 設定適用

```bash
mmcp apply [options]
```

**主なオプション:**
- `--agents <id...>`: 適用対象エージェントを指定
- `--servers <name...>`: 適用するサーバーを選択（`ALL`で全選択）
- `--exclude <name...>`: 除外するサーバーを指定
- `--template <name>`: テンプレートを使用
- `--reset`: 既存設定を置換（選択したサーバーのみ残す）
- `--allow-empty`: `--reset`時に空設定を許可
- `--config <path>`: 設定ファイルのパスを指定

**制約:**
- `--servers`と`--exclude`は同時指定不可
- テンプレートの`servers`定義時は`--exclude`と併用不可
- テンプレートの`exclude`定義時は`--servers`と併用不可
- `--reset`は単体では実行不可

### `mmcp agents` - エージェント管理

```bash
mmcp agents add <id...>     # エージェント追加
mmcp agents remove <id...>  # エージェント削除
mmcp agents list            # エージェント一覧
```

**オプション:**
- `--json`: JSON形式で出力（`list`サブコマンド）
- `--config <path>`: 設定ファイルのパスを指定

## 開発

### 必要要件

- [Bun](https://bun.sh/) - ランタイム・パッケージマネージャー



## ライセンス

[MIT](./LICENSE)
