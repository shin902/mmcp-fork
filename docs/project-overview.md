# mmcp プロジェクト概要

## プロジェクトの目的

mmcpは、MCP（Model Context Protocol）サーバー定義を一元管理し、複数のAIエージェントに適用するためのCLIツールです。異なるAIエージェント間でMCPサーバー設定を共有・管理することで、開発者の設定管理負荷を軽減します。

## 主な機能

### 1. MCPサーバー管理
- **サーバー定義の一元管理**: `~/.mmcp.json`でMCPサーバー設定を管理
- **環境変数サポート**: サーバー実行時の環境変数を定義可能
- **設定の永続化**: JSON形式での設定保存・読み込み

### 2. 複数エージェント対応
以下のAIエージェントに対応:
- **Claude Code** (`~/.claude.json`)
- **Claude Desktop** (プラットフォーム別設定パス)
- **Cursor** (`~/.cursor/mcp.json`)
- **Codex CLI** (`~/.codex/config.toml`)
- **Gemini CLI** (`~/.gemini/settings.json`)

### 3. 柔軟な設定適用
- **部分的適用**: 特定のサーバーのみを適用（`--servers`オプション）
- **除外機能**: 特定のサーバーを除外して適用（`--exclude`オプション）
- **リセット機能**: エージェントの設定を指定したサーバーのみにリセット

## アーキテクチャ

### コマンド構造
```
mmcp
├── add <name> <command> [args...]     # MCPサーバー追加
├── remove <name>                      # MCPサーバー削除
├── list                               # 設定済みサーバー一覧
├── apply                              # 設定を各エージェントに適用
└── agents                             # エージェント管理
    ├── add <name...>                  # 適用対象エージェント追加
    ├── remove <name...>               # 適用対象エージェント削除
    └── list                           # 登録済みエージェント一覧
```

### 核となる設計パターン

#### 1. Agent Adapterパターン
各AIエージェントは`AgentAdapter`インターフェースを実装し、異なる設定ファイル形式に対応:

```typescript
interface AgentAdapter {
  configFile: string;
  load(): Config;
  save(config: Config): void;
}
```

実装例:
- `ClaudeCodeAdapter`: JSON形式（`~/.claude.json`）
- `CursorAdapter`: JSON形式（`~/.cursor/mcp.json`）
- `CodexAdapter`: TOML形式（`~/.codex/config.toml`）

#### 2. レジストリパターン
全エージェントアダプターを`src/lib/agents/registry.ts`で一元管理:

```typescript
export const agentRegistry = {
  "claude-code": new ClaudeCodeAdapter(),
  "cursor": new CursorAdapter(),
  // ...
};
```

#### 3. 設定管理システム
- **設定ファイル**: `~/.mmcp.json`でMCPサーバー定義と適用対象エージェントを管理
- **設定読み込み**: `src/lib/config.ts`で設定の読み込み・保存・バリデーションを処理
- **型安全性**: Zodを使用した設定スキーマの検証

### 関数の依存関係

#### メインフロー
1. **エントリポイント**: `src/index.ts` → Commander.jsでCLIを構築
2. **コマンド実行**: 各`src/commands/*` → 対応する機能を実行
3. **設定管理**: 全コマンド → `src/lib/config.ts`（設定読み込み・保存）
4. **エージェント適用**: `apply`コマンド → `src/lib/agents/registry.ts` → 各エージェントアダプター

#### 依存関係の詳細
```
src/index.ts (CLIエントリポイント)
├── src/commands/add.ts → src/lib/config.ts
├── src/commands/remove.ts → src/lib/config.ts  
├── src/commands/list.ts → src/lib/config.ts
├── src/commands/apply.ts → src/lib/config.ts + src/lib/agents/registry.ts
└── src/commands/agents-*.ts → src/lib/config.ts

src/lib/agents/registry.ts
├── src/lib/agents/claude-code.ts
├── src/lib/agents/cursor.ts
├── src/lib/agents/codex.ts
└── ...各エージェントアダプター
```

## 技術スタック

### ランタイム・言語
- **Bun**: 高速なJavaScript/TypeScriptランタイム
- **TypeScript**: 厳格な型チェック設定
- **Node.js**: ランタイム互換性

### 主要ライブラリ
- **Commander.js**: CLIフレームワーク
- **Zod**: スキーマバリデーション
- **@shopify/toml-patch**: TOML操作（Codex CLI用）
- **chalk**: コンソール出力の色付け
- **ora**: プログレスインジケーター

### 開発ツール
- **Biome**: 高速なRust製フォーマッター・リンター
- **Bun Test**: ビルトインテストランナー
- **TypeScript**: 厳格な型チェック

## 開発ワークフロー

### セットアップ
```bash
bun install                    # 依存関係インストール
```

### 開発・品質チェック
```bash
bun run fmt                    # フォーマット実行
bun run lint                   # リンターチェック
bun run typecheck              # TypeScript型チェック
bun test                       # テスト実行
```

### ビルド・リリース
```bash
bun run build                  # CLIビルド (dist/index.js)
```

### プレコミットチェック
```bash
bun run lint && bun run typecheck && bun run build && bun test
```

## 拡張性

### 新しいエージェント追加
1. `src/lib/agents/`に新しいアダプタークラスを作成
2. `AgentAdapter`インターフェースを実装
3. `src/lib/agents/registry.ts`に登録
4. テストファイル（`*.spec.ts`）を追加

### 新しいコマンド追加
1. `src/commands/`に新しいコマンドファイルを作成
2. `src/index.ts`にコマンド定義を追加
3. 適切なオプション解析とバリデーションを実装

## ディレクトリ構造

```
mmcp/
├── src/
│   ├── index.ts              # CLIエントリポイント
│   ├── commands/             # 各サブコマンドの実装
│   │   ├── add.ts
│   │   ├── remove.ts
│   │   ├── apply.ts
│   │   └── ...
│   └── lib/
│       ├── config.ts         # 設定管理
│       └── agents/           # エージェントアダプター
│           ├── adapter.ts    # インターフェース定義
│           ├── registry.ts   # レジストリ
│           ├── claude-code.ts
│           └── ...
├── docs/                     # ドキュメント
│   └── specs/                # 技術仕様書
├── package.json
├── tsconfig.json
└── biome.json               # フォーマッター・リンター設定
```

## まとめ

mmcpは、MCPサーバー設定の一元管理により、複数のAIエージェント間での設定共有を実現するツールです。Agent Adapterパターンとレジストリパターンを組み合わせることで、新しいエージェントの追加が容易になっており、TypeScriptとBunによる高速で型安全な開発環境を提供しています。