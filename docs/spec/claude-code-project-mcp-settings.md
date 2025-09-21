# Claude Code プロジェクトレベル MCP サーバー設定 仕様書

## 1. 概要

### 1.1 背景
現在の mmcp は MCP (Model Context Protocol) サーバー設定をグローバルファイル (`~/.claude.json`) のみで管理している。この仕様書は、プロジェクトレベルでの MCP サーバー設定をサポートし、チーム開発やプロジェクト固有の設定を可能にする機能の実装について記述する。

### 1.2 目的
- プロジェクトごとに異なる MCP サーバー設定を定義可能にする
- チーム開発において設定を共有可能にする
- 個人のローカル設定とチーム共有設定を分離する
- グローバル設定とプロジェクト設定の適切な統合を実現する

## 2. 設定ファイルの構造と優先順位

### 2.1 設定ファイルの種類

#### 2.1.1 グローバル設定ファイル
- **パス**: `~/.claude.json`
- **用途**: システム全体で使用される MCP サーバー設定
- **管理**: ユーザーが個人的に管理
- **VCS**: 管理対象外

#### 2.1.2 プロジェクト設定ファイル
- **パス**: `<project-root>/settings.json`
- **用途**: プロジェクト固有の MCP サーバー設定（チーム共有用）
- **管理**: プロジェクトチームが管理
- **VCS**: Git 等で管理（チーム間で共有）

#### 2.1.3 ローカルプロジェクト設定ファイル
- **パス**: `<project-root>/settings.local.json`
- **用途**: 個人のローカル環境用設定（プロジェクト固有）
- **管理**: 個人が管理
- **VCS**: `.gitignore` で除外（個人設定のため共有しない）

### 2.2 設定ファイルの優先順位

設定は以下の優先順位で適用される（高い順）：

1. **ローカルプロジェクト設定** (`settings.local.json`)
2. **プロジェクト設定** (`settings.json`)
3. **グローバル設定** (`~/.claude.json`)

### 2.3 設定のマージ戦略

#### 2.3.1 基本的なマージルール
- MCP サーバーの配列は結合される（重複削除）
- 同じ名前の MCP サーバーがある場合、より高い優先順位の設定が優先される
- 環境変数や引数は、より高い優先順位の設定で完全に上書きされる

#### 2.3.2 マージの例
```json
// ~/.claude.json (グローバル設定)
{
  "mcpServers": {
    "global-server": {
      "command": "global-mcp",
      "args": ["--global"]
    }
  }
}

// ./settings.json (プロジェクト設定)
{
  "mcpServers": {
    "project-server": {
      "command": "project-mcp",
      "args": ["--project"]
    }
  }
}

// ./settings.local.json (ローカル設定)
{
  "mcpServers": {
    "local-server": {
      "command": "local-mcp",
      "args": ["--local"]
    },
    "project-server": {
      "command": "project-mcp",
      "args": ["--local-override"]
    }
  }
}

// 最終的にマージされた設定
{
  "mcpServers": {
    "global-server": {
      "command": "global-mcp",
      "args": ["--global"]
    },
    "project-server": {
      "command": "project-mcp",
      "args": ["--local-override"]  // ローカル設定で上書き
    },
    "local-server": {
      "command": "local-mcp",
      "args": ["--local"]
    }
  }
}
```

## 3. 実装仕様

### 3.1 プロジェクトルートの検出

#### 3.1.1 検出アルゴリズム
1. 現在のディレクトリから開始
2. 上位ディレクトリへ向かって順次検索
3. 以下のいずれかが見つかった場合、そのディレクトリをプロジェクトルートとする：
   - `.git` ディレクトリ
   - `package.json` ファイル
   - `settings.json` または `settings.local.json` ファイル
4. ルートディレクトリまで検索しても見つからない場合は、プロジェクト設定なしとして処理

#### 3.1.2 実装コード例
```typescript
function findProjectRoot(startDir: string): string | null {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    if (
      fs.existsSync(path.join(currentDir, '.git')) ||
      fs.existsSync(path.join(currentDir, 'package.json')) ||
      fs.existsSync(path.join(currentDir, 'settings.json')) ||
      fs.existsSync(path.join(currentDir, 'settings.local.json'))
    ) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}
```

### 3.2 ClaudeCodeAgent クラスの拡張

#### 3.2.1 新しいメソッド
```typescript
class ClaudeCodeAgent extends AgentAdapter {
  // 既存のメソッド...

  /**
   * プロジェクト設定ファイルを読み込む
   */
  private async loadProjectSettings(projectRoot: string): Promise<any> {
    const settingsPath = path.join(projectRoot, 'settings.json');
    const localSettingsPath = path.join(projectRoot, 'settings.local.json');

    let settings = {};

    // settings.json を読み込み
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(await fs.promises.readFile(settingsPath, 'utf8'));
    }

    // settings.local.json を読み込み（存在する場合）
    if (fs.existsSync(localSettingsPath)) {
      const localSettings = JSON.parse(await fs.promises.readFile(localSettingsPath, 'utf8'));
      settings = this.mergeSettings(settings, localSettings);
    }

    return settings;
  }

  /**
   * 設定をマージする
   */
  private mergeSettings(base: any, override: any): any {
    const merged = { ...base };

    if (override.mcpServers) {
      merged.mcpServers = {
        ...(base.mcpServers || {}),
        ...override.mcpServers
      };
    }

    return merged;
  }

  /**
   * apply メソッドの拡張
   */
  async apply(servers: MCPServer[], options?: ApplyOptions): Promise<void> {
    const projectRoot = findProjectRoot(process.cwd());
    let finalServers = [...servers];

    if (projectRoot && !options?.projectOnly) {
      const projectSettings = await this.loadProjectSettings(projectRoot);
      if (projectSettings.mcpServers) {
        // プロジェクト設定の MCP サーバーを追加
        const projectServers = Object.entries(projectSettings.mcpServers)
          .map(([name, config]: [string, any]) => ({
            name,
            ...config
          }));
        finalServers = this.mergeServers(finalServers, projectServers);
      }
    }

    if (!options?.projectOnly) {
      // グローバル設定も適用
      await super.apply(finalServers, options);
    } else {
      // プロジェクト設定のみを適用
      await this.applyProjectSettings(projectRoot!, finalServers);
    }
  }

  /**
   * プロジェクト設定のみを適用
   */
  private async applyProjectSettings(projectRoot: string, servers: MCPServer[]): Promise<void> {
    const settingsPath = path.join(projectRoot, 'settings.json');
    const settings = {
      mcpServers: servers.reduce((acc, server) => {
        acc[server.name] = {
          command: server.command,
          args: server.args,
          env: server.env
        };
        return acc;
      }, {} as any)
    };

    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }
}
```

### 3.3 CLI コマンドの拡張

#### 3.3.1 新しいオプション
```bash
# プロジェクト設定を考慮して適用
mmcp apply

# プロジェクト設定のみを適用（グローバル設定を無視）
mmcp apply --project-only

# 特定のプロジェクトディレクトリを指定
mmcp apply --project /path/to/project

# プロジェクト設定を無視してグローバル設定のみ適用
mmcp apply --global-only
```

#### 3.3.2 コマンド実装例
```typescript
// src/commands/apply.ts
program
  .command('apply')
  .description('Apply MCP server configurations')
  .option('--project-only', 'Apply only to project settings')
  .option('--global-only', 'Apply only to global settings')
  .option('--project <path>', 'Specify project directory')
  .action(async (options) => {
    const config = await loadConfig();
    const agents = options.agent ? [options.agent] : config.agents;

    for (const agentName of agents) {
      const agent = getAgent(agentName);

      if (options.project) {
        process.chdir(options.project);
      }

      await agent.apply(config.servers, {
        projectOnly: options.projectOnly,
        globalOnly: options.globalOnly
      });
    }
  });
```

## 4. セキュリティと検証

### 4.1 セキュリティ考慮事項

#### 4.1.1 信頼できないプロジェクトからの保護
- プロジェクト設定を自動的に適用する前に、ユーザーに確認を求めるオプションを提供
- 許可リスト/拒否リストメカニズムの実装を検討

#### 4.1.2 機密情報の管理
- API キーやトークンは環境変数を使用することを推奨
- `settings.local.json` には機密情報を含めることを許可（VCS 管理外のため）
- `settings.json` には機密情報を含めないよう警告

### 4.2 設定の検証

#### 4.2.1 スキーマ検証
```typescript
interface ProjectSettings {
  mcpServers?: {
    [key: string]: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
  };
}

function validateProjectSettings(settings: any): settings is ProjectSettings {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  if (settings.mcpServers) {
    if (typeof settings.mcpServers !== 'object') {
      return false;
    }

    for (const [name, config] of Object.entries(settings.mcpServers)) {
      if (typeof config !== 'object' || !config.command) {
        return false;
      }
    }
  }

  return true;
}
```

## 5. 実装フェーズ

### Phase 1: 基本実装（必須機能）
- [ ] プロジェクトルート検出機能の実装
- [ ] `settings.json` の読み込み機能
- [ ] 設定マージロジックの実装
- [ ] ClaudeCodeAgent の `apply` メソッド拡張

### Phase 2: 拡張機能
- [ ] `settings.local.json` のサポート
- [ ] CLI オプション (`--project-only`, `--global-only`, `--project`) の追加
- [ ] 設定検証機能の実装

### Phase 3: セキュリティと最適化
- [ ] 信頼性チェック機能の追加
- [ ] 環境変数展開のサポート
- [ ] エラーハンドリングの改善

### Phase 4: テストとドキュメント
- [ ] ユニットテストの作成
- [ ] 統合テストの実装
- [ ] ユーザードキュメントの作成
- [ ] マイグレーションガイドの作成

## 6. テスト計画

### 6.1 ユニットテスト
- プロジェクトルート検出のテスト
- 設定ファイル読み込みのテスト
- 設定マージロジックのテスト
- 検証機能のテスト

### 6.2 統合テスト
- 異なる設定ファイル構成でのエンドツーエンドテスト
- CLI コマンドの動作確認
- エラーケースの処理確認

### 6.3 テストケース例
```typescript
describe('ProjectSettings', () => {
  it('should find project root with .git directory', () => {
    const projectRoot = findProjectRoot('/path/to/project/src');
    expect(projectRoot).toBe('/path/to/project');
  });

  it('should merge settings correctly', () => {
    const global = { mcpServers: { a: { command: 'cmd-a' } } };
    const project = { mcpServers: { b: { command: 'cmd-b' } } };
    const local = { mcpServers: { a: { command: 'cmd-a-override' } } };

    const merged = mergeAllSettings(global, project, local);

    expect(merged.mcpServers.a.command).toBe('cmd-a-override');
    expect(merged.mcpServers.b.command).toBe('cmd-b');
  });
});
```

## 7. 互換性と移行

### 7.1 後方互換性
- 既存のグローバル設定ファイル (`~/.claude.json`) は引き続きサポート
- プロジェクト設定が存在しない場合は、従来通りグローバル設定のみを使用

### 7.2 移行パス
1. 既存ユーザーは何も変更する必要なし（グローバル設定が引き続き動作）
2. プロジェクト固有の設定が必要な場合のみ、`settings.json` を作成
3. 個人用カスタマイズが必要な場合は `settings.local.json` を追加

## 8. 使用例

### 8.1 基本的な使用例
```bash
# プロジェクトディレクトリで設定を適用
cd /path/to/my-project
mmcp apply

# プロジェクト設定のみを適用
mmcp apply --project-only

# 特定のサーバーを追加
mmcp add my-project-server --project-only
```

### 8.2 チーム開発での使用例
```bash
# チーム共有設定（settings.json）
{
  "mcpServers": {
    "team-db": {
      "command": "mcp-postgres",
      "args": ["--host", "team-db.example.com"]
    }
  }
}

# 個人のローカル設定（settings.local.json）
{
  "mcpServers": {
    "team-db": {
      "command": "mcp-postgres",
      "args": ["--host", "localhost", "--port", "5432"]
    }
  }
}
```

## 9. エラーハンドリング

### 9.1 想定されるエラーケース
- 設定ファイルの JSON パースエラー
- 無効な設定スキーマ
- ファイル読み込み権限エラー
- 循環参照の検出

### 9.2 エラー処理の実装
```typescript
try {
  const settings = await loadProjectSettings(projectRoot);
  if (!validateProjectSettings(settings)) {
    throw new Error('Invalid project settings format');
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    // ファイルが存在しない場合は無視
    return {};
  } else if (error instanceof SyntaxError) {
    // JSON パースエラー
    console.error(`Invalid JSON in settings file: ${error.message}`);
    throw error;
  } else {
    // その他のエラー
    console.error(`Failed to load project settings: ${error.message}`);
    throw error;
  }
}
```

## 10. まとめ

この仕様により、mmcp は個人利用からチーム開発まで幅広いユースケースに対応できるようになる。プロジェクトレベルの設定サポートにより、以下の利点が得られる：

- **柔軟性**: プロジェクトごとに異なる MCP サーバー設定が可能
- **チーム協調**: 設定の共有によりチーム開発が効率化
- **個人カスタマイズ**: ローカル設定により個人の開発環境を最適化
- **段階的移行**: 既存ユーザーへの影響を最小限に抑えた実装

実装は段階的に進め、各フェーズでテストと検証を行うことで、品質と安定性を確保する。