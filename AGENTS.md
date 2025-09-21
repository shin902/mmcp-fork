# リポジトリ運用ガイドライン

## プロジェクト構成 / モジュール配置
- `src/index.ts`: `commander` を用いた CLI エントリポイント。
- `src/commands/*`: サブコマンド実装（`add`, `remove`, `apply`, `list`, `agents add/remove/list`）。
- `src/lib/config.ts`: JSON 設定のロード/保存（既定パス `~/.mmcp.json`）。
- `src/lib/agents/*`: 各エージェントのアダプタ（例: `claude-code` は `~/.claude.json` を書き込み）。
- `scripts/build.ts`: Bun によるビルドスクリプト（出力は `dist/`）。
- `dist/`: コンパイル済み成果物。手動編集しないこと。
- `docs/partial-apply-spec.md`: 部分適用（`--servers`/`--exclude`）の仕様。

## ビルド / テスト / ローカル開発
```bash
bun install                 # 依存のインストール
bun run lint                # Biome lint
bun run fmt                 # Biome format（書き込み）
bun run typecheck           # TypeScript 型チェック
bun run build               # CLI を dist/index.js にビルド
bun test                    # Bun でテスト実行
```
CI（GitHub Actions）は PR と `main` で lint / build / typecheck / test を実行します。

## コーディング規約 / 命名
- 言語: TypeScript（`strict` 設定）。
- フォーマッタ/リンタ: Biome（`biome.json`）。ダブルクォート・スペースインデント。`noUnusedVariables`/`noUnusedImports` はエラー。
- 命名: ファイルは kebab-case（例: `agents-remove.ts`）。クラス/型は PascalCase。関数/変数は camelCase。
- `dist/` 配下の生成物はコミットしないこと。

## 言語ポリシー
- CLI の出力やドキュメント、リポジトリ内でのコミュニケーションは常に日本語で行うこと。
- コミットメッセージやプルリクエストのタイトル・説明も日本語で記述すること。

## テスト指針
- ランナー: `bun test`。
- 命名: `*.spec.ts` を使用。
- 位置: テストは対象コードの近傍に配置。
- 境界/エラーパス（無効なオプション、未対応エージェント、設定欠如など）をカバー。
- CI で厳密なカバレッジ閾値は無し。公開 API や CLI の挙動に意味のあるテストを追加。

## コミット / PR ガイドライン
- Conventional Commits を使用（`feat:`, `fix:`, `chore:`, `docs:` など）。リリース/CHANGELOG は Release Please が処理。
- pre-commit は lint-staged → Biome を実行。プッシュ前に以下をローカルで通すこと:
  `bun run lint && bun run typecheck && bun run build && bun test`
- PR には目的、変更概要、再現/検証手順、関連 Issue を含める。ユーザー向け挙動が変わる場合は `README.md` を更新。

## セキュリティ / 設定の注意
- `mmcp` はユーザー設定を `~/.mmcp.json` に書きます。シークレットはコミットしないこと。サーバー追加時の秘匿値は `--env KEY=VALUE` で渡してください。
- 対応エージェント: `claude-code`, `claude-desktop`, `codex-cli`, `gemini-cli`。エージェント追加時は `src/lib/agents/` にアダプタを実装し、`registry.ts` に登録してください。
