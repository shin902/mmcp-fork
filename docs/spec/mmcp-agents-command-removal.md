# mmcp agentsコマンド削除仕様書

## 背景
- `mmcp add` / `mmcp remove` は既に廃止され、利用者には `~/.mmcp.json` を直接編集する運用を案内している。
- それにもかかわらず `mmcp agents add/remove/list` サブコマンドが CLI に残存し、ドキュメントにも案内が残っているため、ユーザー体験と実際の推奨フローが乖離している。
- CLI 側のメンテナンス対象を減らし、設定ファイル中心の運用へ一本化することで、将来の MCP 対応拡張時の保守コストを下げる。

## 目的
- `mmcp agents` サブコマンド群を CLI から完全に除去し、対象エージェント管理は設定ファイルと `mmcp apply --agents` に統一する。
- サブコマンド廃止後も既存ユーザーが迷わないよう、明確な代替手順とエラーメッセージを用意する。
- 破壊的変更としてドキュメント・リリースノートで周知する。

## 成果物
- CLI 仕様の更新設計（`src/index.ts` から `agents` コマンド関連の削除、エラーメッセージ追加案）。
- コマンド実装ファイル削除方針（`src/commands/agents-*.ts`）。
- ドキュメント更新リスト（README、AGENTS.md、関連ガイド）。
- テスト観点と確認手順。
- リリースおよび移行時のアナウンス内容。

## スコープ
### 対象
- `src/index.ts` に定義されている `agents` サブコマンド群と関連 import の削除。
- `agentsAddCommand` / `agentsRemoveCommand` / `agentsListCommand` 実装ファイルの削除とビルド設定の整理。
- `mmcp agents ...` 実行時に `commander.unknownCommand` が発生した場合の案内文追加。
- ドキュメント・サンプル・QA の更新。
- 破壊的変更に伴うリリース告知の準備。

### 非対象
- `apply` / `list` コマンドおよび `config.agents` 配列のロジック変更。
- `.mmcp.json` のスキーマ追加・削除。
- 新規 CLI オプションの導入やテンプレート機能の仕様変更。
- MCP エージェントアダプタ（`src/lib/agents/*`）の挙動変更。

## 現状整理
- CLI (`src/index.ts`) で `program.command("agents")` から `add` / `remove` / `list` を提供。
- 各サブコマンドは `supportedAgentIds()`（`claude-code`, `claude-desktop`, `codex-cli`, `cursor`, `gemini-cli`）を `choices` として利用。
- 設定ファイル `~/.mmcp.json` の `agents` 配列は `mmcp apply` 時のデフォルト対象として利用されている。
- README や AGENTS.md に `mmcp agents add/list` の例が残存。
- `CommanderError` の `unknownCommand` ハンドリングでは `add` と `remove` 廃止時の案内のみ定義されており、`agents` サブコマンドには未対応。

## 詳細仕様
### CLI からのサブコマンド撤去
1. `src/index.ts` から `agentsAddCommand` / `agentsRemoveCommand` / `agentsListCommand` の import を削除する。
2. `program.command("agents")` ブロック全体を削除する。
3. `CommanderError` の `unknownCommand` 例外ハンドリングに `"'agents'"` を含むケースを追加し、以下のメッセージを表示する：
   - `mmcp agents サブコマンドは削除されました。~/.mmcp.json の "agents" 配列を直接編集するか、mmcp apply --agents を利用してください。`
   - 既存の `mmcp add/remove` 廃止メッセージと文体・敬体を揃える。
4. その他の CLI 挙動（終了コード、ヘルプ表示、`mmcp apply --agents` の解釈）は変更しない。

### コマンド実装ファイル
- `src/commands/agents-add.ts`, `agents-remove.ts`, `agents-list.ts` を削除し、ビルド対象から外す。
- 依存していた `ora` インスタンス削除に伴い、使用箇所が無くなった場合は import を整理。
- 将来の参考としてリリースノートに削除理由と代替手段を明記。

### ドキュメント更新
- `README.md` の Getting Started / Usage から `mmcp agents add` / `mmcp agents list` の記述・サンプルを削除。
- 設定ファイル編集手順を `agents` 配列編集として明文化し、JSON 例を掲載。
- `AGENTS.md` および各エージェントガイド (`CLAUDE.md` 等) から `agents` コマンドの記述を削除し、代わりに `mmcp apply --agents` の一時指定と直接編集手順を案内。
- `docs/project-overview.md` や他の仕様書に記載されているサブコマンド一覧を更新。
- FAQ もしくは注意書きに「v2.0.0 以降で `mmcp agents` は利用できない」旨を追記。

### ユーザー移行ガイド
1. 既存ユーザーは `~/.mmcp.json` を編集し、`agents` 配列へ対象エージェント ID（`claude-code`, `claude-desktop`, `codex-cli`, `cursor`, `gemini-cli`）を列挙する。
2. 一時的に適用対象を切り替えたい場合は `mmcp apply --agents <id...>` を利用する。
3. CI やスクリプトで `mmcp agents` を呼び出している場合は、設定ファイル編集ステップに置き換えるか、JSON 編集用スクリプトに差し替える。
4. 旧バージョンからのアップグレード時は `npm install -g mmcp@1.x` のままでは挙動が異なることを Release Note に記載。

### テスト計画
- 単体テスト：既存 `apply` 系テスト (`src/commands/apply.spec.ts`) に影響がないことを確認。
- CLI 回帰テスト：`node dist/index.js agents add` 実行で `commander.unknownCommand` が発生し、想定メッセージが出力されることを手動確認。
- ドキュメント整合性チェック：README のコマンド例を手動で実行し、書式の崩れがないことを確認。
- リグレッション防止：将来 `agents` コマンドを誤って復活させないよう、E2E テストで `mmcp agents list` を実行した際に廃止メッセージを期待するケースを追加するか検討（任意）。

### リリース計画
- 破壊的変更のためメジャーバージョン (例: `v2.0.0`) のタイミングで反映。
- PR タイトル例：`feat: mmcp agents サブコマンドを削除`。
- PR 説明には以下を含める：目的、主要変更点、ユーザー影響、移行手順、検証コマンド (`bun run lint`, `bun run typecheck`, `bun run build`, `bun test`)。
- CHANGELOG (Release Please) に `BREAKING CHANGE` として記載し、廃止理由・代替手段を明示。

### リスクと対応
| リスク | 影響 | 対応策 |
| --- | --- | --- |
| 既存スクリプトが `mmcp agents` に依存 | 自動化フローが失敗 | 事前告知と README への移行ガイド、CI 失敗時の案内メッセージ整備 |
| 設定ファイル編集手順が不明瞭 | サポート問い合わせ増加 | JSON サンプルと FAQ の整備、`mmcp apply --agents` の使い方を丁寧に解説 |
| エラーメッセージ未翻訳 | UX 低下 | 既存 `mmcp add/remove` と同様に日本語で案内 |
| 古い `mmcp` バージョンとの混在利用 | 利用者が挙動差分を誤認 | バージョン表記を README 先頭に追記し、`--version` 出力例を提示 |

### タスク一覧
- [ ] `src/index.ts` から `agents` サブコマンド関連の import と定義を削除する。
- [ ] `src/commands/agents-*.ts` ファイルを削除し、ビルド成果物から除外する。
- [ ] `CommanderError` ハンドラに `agents` 廃止メッセージを追加する。
- [ ] README / AGENTS.md / CLAUDE.md / docs/spec 等のドキュメントから `mmcp agents` の記述を撤去し、代替手順を追記する。
- [ ] 手動確認手順とテストケースを README もしくは開発者向けガイドへ追記する。
- [ ] Release Note 下書きを準備し、`BREAKING CHANGE` を明示する。

### フォローアップ
- 利用者フィードバック（Issue / Discussion）を 1 リリース分モニタリングし、必要に応じて `mmcp apply --agents` の UI 改善を検討。
- 将来的に設定ファイル編集を簡略化するユーティリティ (`mmcp config set agents ...`) の要望があれば別タスク化する。

## 承認依頼事項
- 破壊的変更としてメジャーバージョンアップを行うこと。
- `mmcp agents` コマンドに依存する既存スクリプト利用者への周知方法（ブログ、リリースノート、Slack 等）。
- ドキュメント更新に合わせて翻訳や表現のトーン＆マナーを統一すること。
