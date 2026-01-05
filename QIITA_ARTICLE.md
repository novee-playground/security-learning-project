# セキュリティ学習用の脆弱なWebアプリケーションを作ってみた【React + Node.js + Docker】

## はじめに

Webアプリケーションのセキュリティを学ぶために、**意図的に100以上の脆弱性を埋め込んだ学習用アプリケーション**を作成しました。この記事では、その開発過程と学んだことを共有します。

:::note warn
⚠️ **重要な注意事項**
この記事で紹介するコードには意図的にセキュリティ脆弱性が含まれています。教育目的のみで使用し、本番環境では絶対に使用しないでください。
:::

## 🎯 プロジェクトの目的

- OWASP Top 10の脆弱性を実践的に学ぶ
- ペネトレーションテストの練習環境を構築
- セキュアコーディングのベストプラクティスを理解する

## 🛠️ 技術スタック

- **フロントエンド**: React 18
- **バックエンド**: Node.js + Express
- **データベース**: PostgreSQL + MongoDB
- **コンテナ**: Docker + Docker Compose
- **テストツール**: OWASP ZAP, Burp Suite, SQLMap

## 📁 プロジェクト構造

```
security-learning-project/
├── vulnerable-app/          # 脆弱なアプリケーション
│   ├── backend/            # Node.js API
│   ├── frontend/           # React SPA
│   └── docker-compose.yml  # 環境構築
├── VULNERABILITIES.md      # 脆弱性リスト
└── README.md
```

## 🚀 環境構築

### Docker Composeで一発起動

```bash
cd vulnerable-app
docker-compose up -d
```

これだけで以下のサービスが起動します：

- フロントエンド: <http://localhost:3001>
- バックエンドAPI: <http://localhost:3000>
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Adminer (DB管理): <http://localhost:8080>

## 🔐 埋め込んだ脆弱性（一部紹介）

### 1. SQLインジェクション

**脆弱なコード例**:

```javascript
// backend/src/routes/auth.js
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // ❌ ユーザー入力を直接SQLに埋め込み
    const query = `SELECT * FROM users WHERE username = '${username}'`;
    const result = await executeRawQuery(query);
    
    // ...
});
```

**攻撃例**:

```
ユーザー名: admin' OR '1'='1
パスワード: anything
```

これで認証をバイパスしてログインできてしまいます。

**正しい実装**:

```javascript
// ✅ パラメータ化クエリを使用
const query = 'SELECT * FROM users WHERE username = $1';
const result = await pool.query(query, [username]);
```

### 2. XSS（クロスサイトスクリプティング）

**脆弱なコード例**:

```javascript
// frontend/src/components/Home.js
<div
    className="post-content"
    dangerouslySetInnerHTML={{ __html: post.content }}
/>
```

**攻撃例**:
投稿内容に以下を入力：

```html
<script>alert('XSS Attack!')</script>
```

**正しい実装**:

```javascript
// ✅ HTMLをエスケープして表示
<div className="post-content">
    {post.content}
</div>
```

### 3. 認証なしのパスワードリセット

**脆弱なコード例**:

```javascript
// backend/src/routes/auth.js
router.post('/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;
    
    // ❌ 認証チェックなし！
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = `UPDATE users SET password = '${hashedPassword}' WHERE username = '${username}'`;
    await executeRawQuery(query);
    
    res.json({ message: 'Password reset successfully' });
});
```

誰でも他人のパスワードを変更できてしまいます。

**正しい実装**:

```javascript
// ✅ メール確認とトークン検証を実装
router.post('/reset-password', verifyResetToken, async (req, res) => {
    // トークンの検証後にパスワード変更
});
```

### 4. 権限昇格の脆弱性

**脆弱なコード例**:

```javascript
// backend/src/routes/auth.js
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    
    // ❌ ユーザーが自分でroleを指定できる
    const userRole = role || 'user';
    
    const query = `INSERT INTO users (username, email, password, role) 
                   VALUES ('${username}', '${email}', '${hashedPassword}', '${userRole}')`;
});
```

**攻撃例**:
登録時にブラウザの開発者ツールで以下を送信：

```json
{
  "username": "hacker",
  "email": "hacker@example.com",
  "password": "test123",
  "role": "admin"
}
```

**正しい実装**:

```javascript
// ✅ roleはサーバー側で固定
const userRole = 'user'; // クライアントからの入力を無視
```

### 5. 機密情報の露出

**脆弱なコード例**:

```javascript
// backend/src/server.js
app.get('/health', (req, res) => {
    res.json({
        database: {
            password: process.env.DB_PASSWORD  // ❌ パスワードを露出
        },
        secrets: {
            jwtSecret: process.env.JWT_SECRET  // ❌ JWT秘密鍵を露出
        }
    });
});
```

**正しい実装**:

```javascript
// ✅ 機密情報を含めない
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});
```

## 📊 埋め込んだ脆弱性の統計

### OWASP Top 10 (2021) 分類

| カテゴリ | 脆弱性数 |
|---------|---------|
| A01: Broken Access Control | 15 |
| A02: Cryptographic Failures | 18 |
| A03: Injection | 20 |
| A04: Insecure Design | 8 |
| A05: Security Misconfiguration | 12 |
| A07: Identification and Authentication Failures | 14 |
| A09: Security Logging and Monitoring Failures | 13 |

**合計**: 100以上の脆弱性

### 深刻度別

| 深刻度 | 脆弱性数 |
|--------|---------|
| Critical | 25 |
| High | 35 |
| Medium | 30 |
| Low | 10+ |

## 🧪 実際に試してみる

### 1. SQLインジェクションでログイン

```
ユーザー名: admin' OR '1'='1
パスワード: （何でもOK）
```

### 2. XSS攻撃

新規投稿で以下を入力：

```html
<script>alert(document.cookie)</script>
```

### 3. 権限昇格

ユーザー登録時に開発者ツールのNetworkタブでリクエストを確認し、`role: "admin"`を追加。

## 🔍 開発中に遭遇した問題と解決策

### 問題1: Docker内でbcryptがクラッシュ

**エラー**:

```
Error: /app/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node: 
Exec format error
```

**原因**:
ローカルのnode_modules（macOS ARM64用）がDockerコンテナ（Linux ARM64）にマウントされ、バイナリの互換性がなかった。

**解決策**:

```yaml
# docker-compose.yml
volumes:
  # ❌ これだとnode_modulesもマウントされる
  # - ./backend:/app
  
  # ✅ 必要なファイルだけマウント
  - ./backend/src:/app/src
  - ./backend/package.json:/app/package.json
```

### 問題2: CORSエラー

**エラー**:

```
Access to XMLHttpRequest has been blocked by CORS policy: 
Request header field x-api-key is not allowed
```

**解決策**:

```javascript
// server.js
app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
```

### 問題3: フロントエンドでのデータ取得エラー

**エラー**:

```
TypeError: posts.map is not a function
```

**原因**:
バックエンドAPIが`{posts: [...]}` という形式で返していたが、フロントエンドは配列を期待していた。

**解決策**:

```javascript
// Home.js
const loadPosts = async () => {
    const data = await postAPI.getPosts();
    // APIレスポンスの形式に対応
    const postsArray = data.posts || data;
    setPosts(Array.isArray(postsArray) ? postsArray : []);
};
```

## 📚 学んだこと

### 1. セキュリティは多層防御が重要

一つの対策だけでは不十分。以下のような多層的なアプローチが必要：

- **入力検証**: クライアント側とサーバー側の両方で
- **出力エスケープ**: XSS対策
- **パラメータ化クエリ**: SQLインジェクション対策
- **認証・認可**: すべてのエンドポイントで
- **セキュリティヘッダー**: CSP、HSTS、X-Frame-Optionsなど

### 2. 「デフォルトで安全」な設計

- パスワードは必ずハッシュ化
- セッションはHTTPOnlyとSecure属性を有効に
- CORSは必要最小限のオリジンのみ許可
- エラーメッセージは詳細を含めない

### 3. 開発者ツールは攻撃者のツールでもある

ブラウザの開発者ツールで以下が可能：

- リクエストの改ざん
- localStorageの閲覧・編集
- JavaScriptの実行

クライアント側の検証だけでは不十分で、サーバー側での検証が必須。

### 4. ログとモニタリングの重要性

攻撃を検知するには：

- 適切なログ記録
- 異常なアクセスパターンの検出
- セキュリティイベントのアラート

ただし、ログに機密情報を含めないよう注意。

## 🎓 次のステップ

このプロジェクトを使って以下を学ぶ予定：

1. **ペネトレーションテスト**
   - OWASP ZAPでの自動スキャン
   - Burp Suiteでの手動テスト
   - SQLMapでのSQLインジェクション検証

2. **セキュアなアプリケーションの実装**
   - すべての脆弱性を修正
   - ベストプラクティスの適用
   - セキュリティテストの自動化

3. **CI/CD統合**
   - セキュリティスキャンの自動化
   - 脆弱性検出時のビルド失敗

## 📖 参考資料

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- 「体系的に学ぶ 安全なWebアプリケーションの作り方」徳丸浩

## 🔗 リポジトリ

完全なソースコードとドキュメントはGitHubで公開予定です。

:::note
このプロジェクトは教育目的で作成されています。実際のアプリケーション開発では、これらの脆弱性を絶対に含めないでください。
:::

## まとめ

脆弱なアプリケーションを意図的に作ることで、以下を学べました：

- ✅ 一般的なセキュリティ脆弱性の実装と悪用方法
- ✅ 攻撃者の視点でのシステム評価
- ✅ セキュアコーディングのベストプラクティス
- ✅ Docker環境でのトラブルシューティング

セキュリティは一度学んで終わりではなく、継続的な学習が必要です。このプロジェクトを通じて、実践的なセキュリティスキルを身につけることができました。

皆さんもぜひ、安全な環境でセキュリティテストを試してみてください！

---

**タグ**: #セキュリティ #React #Node.js #Docker #OWASP #ペネトレーションテスト #脆弱性 #学習

**作成日**: 2026-01-05
