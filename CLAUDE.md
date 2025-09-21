# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 必須コマンド（開発で使用するコマンド）

### 依存関係とセットアップ
```bash
bun install                 # 依存関係をインストール
```

### 開発・コード品質
```bash
bun run fmt                 # Biomeフォーマッタを実行（ファイルを変更）
bun run lint                # Biomeリンターを実行
bun run typecheck           # TypeScript型チェック
bun test                    # Bunでテスト実行
```

### ビルド・リリース
```bash
bun run build               # CLIをdist/index.jsにビルド
```

### コードプッシュ前の必須チェック
```bash
bun run lint && bun run typecheck && bun run build && bun test
```

## アーキテクチャとプロジェクト構造

### 概要
mmcpはMCP（Model Context Protocol）サーバー定義を一箇所で管理し、複数のAIエージェントに適用するためのCLIツールです。

### 核となるアーキテクチャパターン

#### Commanderベースのコマンド構造
- エントリポイント：`src/index.ts`でcommander.jsを使用
- 各サブコマンド：`src/commands/*`に独立して実装
- サポートされるコマンド：`add`, `remove`, `apply`, `list`, `agents add/remove/list`

#### Agent Adapterパターン
- 抽象化層：`src/lib/agents/adapter.ts`でAgentAdapterインターフェースを定義
- 具象実装：各エージェント（claude-code、claude-desktop、codex-cli、cursor、gemini-cli）用のアダプター
- レジストリ：`src/lib/agents/registry.ts`で一元管理

#### 設定システム
- デフォルト設定パス：`~/.mmcp.json`
- 構造化設定：`src/lib/config.ts`でJSON形式の読み込み/保存を処理
- エージェント設定：各エージェント固有の設定ファイルに書き込み（例：claude-codeは`~/.claude.json`）

### 重要な実装パターン

#### 新しいエージェント追加時
1. `src/lib/agents/`に新しいアダプタークラスを作成
2. `AgentAdapter`インターフェースを実装
3. `src/lib/agents/registry.ts`に登録
4. `*.spec.ts`ファイルでテストカバレッジを追加

#### コマンド追加時
1. `src/commands/`に新しいコマンドファイルを作成
2. `src/index.ts`にコマンド定義を追加
3. 適切なオプション解析とバリデーションを実装

### 開発時の注意点
- Bunを使用した高速ビルド・テスト環境
- Biomeによる統一されたコードスタイル（ダブルクォート、スペースインデント）
- 厳格なTypeScript設定
- プレコミットフックによる品質管理（lint-staged + Biome）
- Conventional Commitsとrelease-pleaseによる自動リリース管理