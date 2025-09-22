# Repository Guidelines

## プロジェクト構成とモジュール配置
`src/index.ts` は commander ベースの CLI エントリポイントです。サブコマンド実装は `src/commands/*` にあり、`add` `remove` `apply` `list` `agents add/remove/list` を提供します。設定ロジックは `src/lib/config.ts` が担い、ユーザー設定 `~/.mmcp.json` を読み書きします。各エージェントアダプタは `src/lib/agents/` に配置し、例として `claude-code` は `~/.claude.json` を管理します。ビルドスクリプトは `scripts/build.ts`、成果物は `dist/` で手動編集禁止です。部分適用仕様は `docs/partial-apply-spec.md` を参照してください。

## ビルド・テスト・開発コマンド
依存導入は `bun install`。静的解析は `bun run lint` (Biome lint)。整形は `bun run fmt` で直接書き込みます。型検証は `bun run typecheck`。ビルドは `bun run build` が `dist/index.js` を生成します。テストは `bun test` で Bun ランナーを起動します。PR 前チェックは `bun run lint && bun run typecheck && bun run build && bun test` の連続実行が推奨です。

## コーディングスタイルと命名規則
TypeScript `strict` モードを前提とします。フォーマットと lint は Biome (`biome.json`) に従い、ダブルクォートとスペースインデントを使用します。未使用変数・未使用インポートはエラーです。ファイル名は kebab-case、型・クラスは PascalCase、関数と変数は camelCase を守ってください。

## テストガイドライン
テストは Bun の `bun test` を利用し、ファイル名は `*.spec.ts` とします。対象コード付近に配置し、無効オプションや設定欠如などエラーパスもカバーしてください。現時点で厳密なカバレッジ閾値はありませんが、CLI の公開挙動を重点的に検証します。

## コミットとプルリクエストガイドライン
コミットは Conventional Commits (`feat:` `fix:` `chore:` など) を用い、メッセージは日本語でまとめます。PR では目的・変更概要・検証手順・関連 Issue を明記し、ユーザー向け挙動が変わる場合は `README.md` を更新してください。pre-commit は lint-staged 経由で Biome を実行します。

## セキュリティと設定の注意
`mmcp` は `~/.mmcp.json` に設定を書き込みます。シークレットはコミットせず、サーバー追加時の秘匿値は `--env KEY=VALUE` で渡します。対応エージェント (`claude-code` `claude-desktop` `codex-cli` `gemini-cli`) を追加する際は `src/lib/agents/` にアダプタを作成し `registry.ts` に登録してください。