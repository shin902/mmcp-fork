# MCPサーバーのテンプレート機能 - 実装仕様

## 概要
`.mmcp.json`にテンプレートを定義し、`--template`オプションで複数のサーバーやexcludeパターンを一括適用できる機能を追加します。

## 詳細仕様

### 1. 設定ファイル構造
`.mmcp.json`に新しく`templates`フィールドを追加：

```json
{
  "agents": ["claude-code", "claude-desktop"],
  "mcpServers": {
    "context7": { ... },
    "everything": { ... },
    "filesystem": { ... },
    "github": { ... }
  },
  "templates": {
    "dev": {
      "servers": ["context7", "filesystem", "github"]
    },
    "minimal": {
      "exclude": ["filesystem", "github"]
    },
    "production": {
      "servers": ["context7", "everything"],
      "exclude": []  // 明示的に空も可能
    }
  }
}
```

### 2. コマンドライン仕様

```bash
# テンプレートを使用
mmcp apply --template dev

# テンプレートと追加のオプションを組み合わせ
mmcp apply --template dev --servers additional-server

# テンプレートとresetオプション
mmcp apply --template minimal --reset
```

### 3. 動作仕様

#### 基本動作
1. `--template template-name`が指定された場合、`.mmcp.json`の`templates[template-name]`を参照
2. テンプレート内の`servers`または`exclude`を既存の`--servers`/`--exclude`オプションに変換
3. コマンドラインで直接指定された`--servers`/`--exclude`がある場合は、テンプレートの値とマージ（重複排除）

#### エラー処理
- 存在しないテンプレート名が指定された場合はエラー
- テンプレートに`servers`と`exclude`が両方定義されている場合はエラー
- `--template`と`--servers`/`--exclude`の組み合わせで矛盾が生じる場合（両方がserversまたは両方がexclude）はエラー

#### --resetオプション対応
- `--template`と`--reset`を組み合わせて使用可能
- `--reset`が指定された場合、テンプレートで指定されたサーバーのみに完全置き換え

### 4. 実装計画

#### ファイル変更
1. **src/lib/config.ts**
   - `configSchema`に`templates`フィールドを追加
   - `templateSchema`の定義（servers/excludeの検証）

2. **src/index.ts**
   - applyコマンドに`--template`オプションを追加

3. **src/commands/apply.ts**
   - テンプレート解決ロジックを追加
   - テンプレートとコマンドラインオプションのマージ処理

4. **src/commands/apply-targets.ts**
   - テンプレート展開後のサーバーフィルタリング（既存ロジックを活用）

5. **テストファイル**
   - 新機能のユニットテストを追加

#### 実装順序
1. 設定スキーマの拡張（templates対応）
2. テンプレート解決ロジックの実装
3. コマンドラインインターフェースの追加
4. エラーハンドリングとバリデーション
5. テストケースの作成
6. ドキュメントの更新

## まとめ
このテンプレート機能により、開発環境や本番環境など、用途に応じたMCPサーバーセットを簡単に切り替えられるようになります。既存の`--servers`/`--exclude`機能を内部的に活用するため、現在の実装との互換性も保たれます。

## 要件まとめ
- serversまたはexcludeのいずれかを指定（両方は不可）
- `.mmcp.json`にテンプレートを記述
- `--reset`オプションにも対応
- `--template template-name`で、`.mmcp.json`に記載のserversやexcludeの値を`--servers`と`--exclude`に変換して、既存のオプションに追記する形で実装