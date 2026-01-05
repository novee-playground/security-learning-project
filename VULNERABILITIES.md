# 脆弱性リスト

このドキュメントでは、学習用脆弱アプリケーションに意図的に埋め込まれたすべてのセキュリティ脆弱性をリスト化しています。

⚠️ **警告**: これらの脆弱性は教育目的でのみ実装されています。本番環境では絶対に使用しないでください。

---

## 目次

1. [フロントエンド脆弱性](#フロントエンド脆弱性)
2. [バックエンド脆弱性](#バックエンド脆弱性)
3. [データベース脆弱性](#データベース脆弱性)
4. [インフラストラクチャ脆弱性](#インフラストラクチャ脆弱性)

---

## フロントエンド脆弱性

### 1. public/index.html

#### 1.1 セキュリティヘッダーの欠如

- **脆弱性**: Content-Security-Policy (CSP) ヘッダーなし
- **影響**: XSS攻撃に対する防御がない
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-79

#### 1.2 X-Frame-Options ヘッダーなし

- **脆弱性**: クリックジャッキング攻撃に脆弱
- **影響**: iframeに埋め込まれて悪用される可能性
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-1021

#### 1.3 APIキーのハードコード

- **脆弱性**: HTMLソースコードにAPIキーを露出

```html
<script>
    window.APP_CONFIG = {
        API_URL: 'http://localhost:3000',
        API_KEY: 'exposed_api_key_12345'
    };
</script>
```

- **影響**: 誰でもAPIキーを取得可能
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-798

#### 1.4 インラインスクリプトの使用

- **脆弱性**: CSPを実装できない
- **影響**: XSS攻撃のリスク増加
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-79

---

### 2. src/index.js

#### 2.1 React Strict Modeの無効化

- **脆弱性**: 開発時の警告が表示されない
- **影響**: 潜在的なバグの検出が困難
- **OWASP**: A04:2021 - Insecure Design

#### 2.2 グローバル変数の露出

- **脆弱性**: `window.React`にReactを露出

```javascript
window.React = React;
window.ReactDOM = ReactDOM;
```

- **影響**: 外部スクリプトからの操作が可能
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-668

#### 2.3 詳細なコンソールログ

- **脆弱性**: アプリケーション情報をコンソールに出力
- **影響**: デバッグ情報の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

---

### 3. src/App.js

#### 3.1 トークン検証なし

- **脆弱性**: JWTトークンの有効性を検証しない

```javascript
const token = getToken();
if (token && user) {
    setIsAuthenticated(true);
}
```

- **影響**: 期限切れや改ざんされたトークンでも認証される
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-287

#### 3.2 ユーザー情報のコンソール出力

- **脆弱性**: 機密情報をコンソールに出力
- **影響**: 開発者ツールで情報が見える
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

#### 3.3 グローバルスコープへの露出

- **脆弱性**: ユーザー情報をwindowオブジェクトに保存

```javascript
window.currentUser = currentUser;
window.isAuthenticated = isAuthenticated;
```

- **影響**: 外部スクリプトからアクセス可能
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-668

#### 3.4 クライアント側のみの認証チェック

- **脆弱性**: ルート保護がクライアント側のみ
- **影響**: JavaScriptを無効化すれば回避可能
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-602

---

### 4. src/services/api.js

#### 4.1 APIキーのハードコード

- **脆弱性**: ソースコードにAPIキーを埋め込み

```javascript
const API_KEY = 'exposed_api_key_12345';
```

- **影響**: GitHubなどで公開されると悪用される
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-798

#### 4.2 localStorageへの機密情報保存

- **脆弱性**: トークンとユーザー情報を平文で保存

```javascript
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));
```

- **影響**: XSS攻撃で盗まれる可能性
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-312

#### 4.3 パスワードの保存

- **脆弱性**: ユーザーパスワードをlocalStorageに保存

```javascript
if (user.password) {
    localStorage.setItem('userPassword', user.password);
}
```

- **影響**: パスワードの漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-256

#### 4.4 CSRFトークンなし

- **脆弱性**: リクエストにCSRFトークンを含めない
- **影響**: CSRF攻撃に脆弱
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-352

#### 4.5 詳細なリクエストログ

- **脆弱性**: すべてのリクエスト内容をコンソールに出力

```javascript
console.log('API Request:', {
    method: config.method,
    url: config.url,
    headers: config.headers,
    data: config.data
});
```

- **影響**: 機密情報の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

#### 4.6 詳細なエラーログ

- **脆弱性**: エラー詳細をコンソールに出力
- **影響**: システム情報の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-209

#### 4.7 URLパラメータに検索クエリ

- **脆弱性**: 検索クエリをURLに直接含める

```javascript
const response = await api.get(`/api/search?q=${query}`);
```

- **影響**: SQLインジェクションのリスク
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 4.8 トークンとユーザー情報のエクスポート

- **脆弱性**: 機密情報を扱う関数をエクスポート
- **影響**: 外部から操作可能
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-668

---

### 5. src/components/Login.js

#### 5.1 クライアント側のみの入力検証

- **脆弱性**: サーバー側の検証がない
- **影響**: バリデーションを回避可能
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-20

#### 5.2 パスワードのコンソール出力

- **脆弱性**: ログイン試行時にパスワードを出力

```javascript
console.log('Login attempt:', { username, password });
```

- **影響**: パスワードの漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

#### 5.3 レスポンス全体のコンソール出力

- **脆弱性**: トークンを含むレスポンスを出力
- **影響**: トークンの漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

#### 5.4 グローバルスコープへの保存

- **脆弱性**: ログインユーザーをwindowに保存

```javascript
window.loggedInUser = response.user;
```

- **影響**: 外部からアクセス可能
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-668

#### 5.5 詳細なエラーメッセージ

- **脆弱性**: エラー詳細をユーザーに表示
- **影響**: システム情報の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-209

#### 5.6 autocomplete有効

- **脆弱性**: パスワードフィールドでautocomplete有効

```html
<input type="password" autoComplete="current-password" />
```

- **影響**: ブラウザにパスワードが保存される
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-522

#### 5.7 テスト用認証情報の表示

- **脆弱性**: デフォルト認証情報を画面に表示

```html
<p>テスト用: admin / admin123</p>
```

- **影響**: 誰でもログイン可能
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-798

#### 5.8 パスワードの可視化

- **脆弱性**: パスワード表示機能
- **影響**: 肩越しに見られるリスク
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-522

---

### 6. src/components/Register.js

#### 6.1 弱いパスワードポリシー

- **脆弱性**: 3文字以上のパスワードを許可

```javascript
if (password.length < 3) {
    setError('パスワードは3文字以上である必要があります');
}
```

- **影響**: 簡単に推測されるパスワード
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-521

#### 6.2 登録情報のコンソール出力

- **脆弱性**: パスワードを含む登録情報を出力

```javascript
console.log('Register attempt:', { username, email, password });
```

- **影響**: 機密情報の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

---

### 7. src/components/Home.js

#### 7.1 削除確認なし

- **脆弱性**: 投稿削除時に確認ダイアログなし
- **影響**: 誤削除のリスク
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-352

#### 7.2 XSS - dangerouslySetInnerHTML

- **脆弱性**: HTMLを直接レンダリング

```javascript
<div dangerouslySetInnerHTML={{ __html: post.content }} />
```

- **影響**: XSS攻撃が可能
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-79

#### 7.3 クライアント側のみの権限チェック

- **脆弱性**: 削除ボタンの表示制御のみ

```javascript
{user.id === post.user_id && (
    <button onClick={() => handleDelete(post.id)}>削除</button>
)}
```

- **影響**: APIを直接呼べば他人の投稿も削除可能
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-639

---

### 8. src/components/PostDetail.js

#### 8.1 XSS - dangerouslySetInnerHTML

- **脆弱性**: 投稿内容とコメントをHTMLと

してレンダリング

- **影響**: XSS攻撃が可能
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-79

---

### 9. src/components/Admin.js

#### 9.1 クライアント側のみの権限チェック

- **脆弱性**: 管理者権限をクライアント側でのみチェック

```javascript
{user.role === 'admin' && (
    <button onClick={() => handleDeleteUser(u.id)}>削除</button>
)}
```

- **影響**: APIを直接呼べば誰でも削除可能
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-639

#### 9.2 削除確認なし

- **脆弱性**: ユーザー削除時に確認ダイアログなし
- **影響**: 誤削除のリスク
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-352

---

## バックエンド脆弱性

### 10. backend/src/server.js

#### 10.1 詳細なエラーメッセージの露出

- **脆弱性**: 常に開発モードで動作

```javascript
process.env.NODE_ENV = 'development';
```

- **影響**: スタックトレースなどの詳細情報が露出
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-209

#### 10.2 緩いCORS設定

- **脆弱性**: すべてのオリジンを許可

```javascript
app.use(cors({
    origin: '*',
    credentials: true
}));
```

- **影響**: CSRF攻撃に脆弱
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-942

#### 10.3 詳細なログ出力

- **脆弱性**: すべてのリクエスト詳細をログに記録

```javascript
console.log('Headers:', req.headers);
console.log('Body:', req.body);
console.log('Cookies:', req.cookies);
```

- **影響**: 機密情報の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

#### 10.4 弱いセッション設定

- **脆弱性**: 弱い秘密鍵とセキュアでない設定

```javascript
session({
    secret: 'weak_session_secret',
    cookie: {
        secure: false,
        httpOnly: false,
        sameSite: 'none'
    }
})
```

- **影響**: セッションハイジャック、CSRF攻撃
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-614

#### 10.5 セキュリティヘッダーの欠如

- **脆弱性**: Helmetを使用していない
- **影響**: 各種攻撃に対する防御がない
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-693

#### 10.6 レート制限なし

- **脆弱性**: APIリクエストの制限がない
- **影響**: ブルートフォース攻撃、DoS攻撃
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-307

#### 10.7 大きなペイロードの許可

- **脆弱性**: 50MBまでのペイロードを許可

```javascript
app.use(express.json({ limit: '50mb' }));
```

- **影響**: DoS攻撃のリスク
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-400

#### 10.8 機密情報の露出（ヘルスチェック）

- **脆弱性**: データベース認証情報を露出

```javascript
app.get('/health', (req, res) => {
    res.json({
        database: {
            password: process.env.DB_PASSWORD
        },
        secrets: {
            jwtSecret: process.env.JWT_SECRET
        }
    });
});
```

- **影響**: 認証情報の漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-200

#### 10.9 詳細なエラーハンドリング

- **脆弱性**: スタックトレースとSQLクエリを返す

```javascript
res.status(500).json({
    error: {
        stack: err.stack,
        sql: err.sql
    }
});
```

- **影響**: システム情報の漏洩
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-209

---

### 11. backend/src/routes/auth.js

#### 11.1 弱いJWT秘密鍵

- **脆弱性**: 簡単に推測できる秘密鍵

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'weak_secret_key';
```

- **影響**: トークンの偽造が可能
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-321

#### 11.2 SQLインジェクション（登録）

- **脆弱性**: ユーザー入力を直接SQLクエリに埋め込み

```javascript
const checkQuery = `SELECT * FROM users WHERE username = '${username}'`;
```

- **影響**: データベースの完全な制御
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 11.3 入力検証の欠如

- **脆弱性**: パスワードの長さや複雑さをチェックしない
- **影響**: 弱いパスワードの許可
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-521

#### 11.4 権限昇格の脆弱性

- **脆弱性**: ユーザーが自分でroleを指定可能

```javascript
const userRole = role || 'user';
```

- **影響**: 誰でも管理者になれる
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-269

#### 11.5 機密情報の露出（登録レスポンス）

- **脆弱性**: SQLクエリとハッシュ化パスワードを返す

```javascript
res.json({
    debug: {
        query: insertQuery,
        hashedPassword: hashedPassword
    }
});
```

- **影響**: システム情報の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-532

#### 11.6 SQLインジェクション（ログイン）

- **脆弱性**: ユーザー名を直接SQLに埋め込み

```javascript
const query = `SELECT * FROM users WHERE username = '${username}'`;
```

- **影響**: 認証バイパス（例: `admin' OR '1'='1`）
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 11.7 ユーザー列挙攻撃

- **脆弱性**: 詳細なエラーメッセージ

```javascript
return res.status(401).json({
    error: 'User not found',
    hint: 'The username does not exist'
});
```

- **影響**: 有効なユーザー名の特定
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-203

#### 11.8 平文パスワードの許可

- **脆弱性**: ハッシュ化されていないパスワードも受け入れる

```javascript
if (!user.password.startsWith('$2')) {
    isValidPassword = password === user.password;
}
```

- **影響**: パスワードの漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-256

#### 11.9 レート制限なし

- **脆弱性**: ログイン試行回数の制限なし

```javascript
attempts_remaining: 'unlimited'
```

- **影響**: ブルートフォース攻撃
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-307

#### 11.10 機密情報をJWTに含める

- **脆弱性**: SSN、APIキーなどをトークンに含める

```javascript
const token = jwt.sign({
    ssn: user.ssn,
    api_key: user.api_key
}, JWT_SECRET);
```

- **影響**: トークンをデコードすれば機密情報が見える
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-200

#### 11.11 機密情報の露出（ログインレスポンス）

- **脆弱性**: SSN、クレジットカード番号を返す

```javascript
res.json({
    user: {
        ssn: user.ssn,
        credit_card: user.credit_card
    },
    debug: {
        jwt_secret: JWT_SECRET
    }
});
```

- **影響**: 個人情報の漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-359

#### 11.12 セッションの不適切な管理

- **脆弱性**: セッションにユーザー情報を保存
- **影響**: セッション固定攻撃
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-384

#### 11.13 JWTの無効化なし

- **脆弱性**: ログアウト時にトークンを無効化しない

```javascript
req.session.destroy();
// JWTは有効なまま
```

- **影響**: ログアウト後もトークンが使用可能
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-613

#### 11.14 認証なしのパスワードリセット

- **脆弱性**: 確認なしでパスワード変更可能

```javascript
router.post('/reset-password', async (req, res) => {
    // 認証チェックなし
    const { username, newPassword } = req.body;
});
```

- **影響**: 任意のユーザーのパスワードを変更可能
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-640

#### 11.15 アルゴリズムの混乱攻撃

- **脆弱性**: 'none'アルゴリズムを許可

```javascript
jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256', 'HS384', 'HS512', 'none']
});
```

- **影響**: 署名なしのトークンが受け入れられる
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-347

---

### 12. backend/src/routes/users.js

#### 12.1 SQLインジェクション

- **脆弱性**: ユーザーIDを直接SQLに埋め込み

```javascript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

- **影響**: データベースの完全な制御
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 12.2 認証チェックなし

- **脆弱性**: 認証なしでユーザー一覧を取得可能
- **影響**: 個人情報の漏洩
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-306

#### 12.3 機密情報の露出

- **脆弱性**: パスワードハッシュ、SSN、クレジットカード番号を返す

```javascript
res.json({
    users: [{
        password: user.password,
        ssn: user.ssn,
        credit_card: user.credit_card
    }]
});
```

- **影響**: 個人情報の大量漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-359

#### 12.4 権限チェックなし（プロフィール更新）

- **脆弱性**: 他人のプロフィールを更新可能
- **影響**: アカウント乗っ取り
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-639

#### 12.5 Mass Assignment脆弱性

- **脆弱性**: すべてのフィールドを更新可能

```javascript
const updateQuery = `UPDATE users SET 
    username = '${username}',
    email = '${email}',
    role = '${role}'
`;
```

- **影響**: 権限昇格（roleを変更可能）
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-915

---

### 13. backend/src/routes/posts.js

#### 13.1 SQLインジェクション（複数箇所）

- **脆弱性**: ユーザー入力を直接SQLに埋め込み

```javascript
const query = `SELECT * FROM posts WHERE id = ${postId}`;
```

- **影響**: データベースの完全な制御
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 13.2 XSS - HTMLの保存

- **脆弱性**: 投稿内容をサニタイズせずに保存
- **影響**: 保存型XSS攻撃
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-79

#### 13.3 認証チェックなし（投稿一覧）

- **脆弱性**: 認証なしで投稿を閲覧可能
- **影響**: 情報漏洩
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-306

#### 13.4 権限チェックなし（削除）

- **脆弱性**: 他人の投稿を削除可能
- **影響**: データの改ざん・削除
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-639

#### 13.5 SQLクエリの露出

- **脆弱性**: 実行したSQLクエリをレスポンスに含める

```javascript
res.json({
    query: query
});
```

- **影響**: データベース構造の漏洩
- **OWASP**: A09:2021 - Security Logging and Monitoring Failures
- **CWE**: CWE-209

---

### 14. backend/src/routes/comments.js

#### 14.1 SQLインジェクション

- **脆弱性**: postIdを直接SQLに埋め込み

```javascript
const query = `SELECT * FROM comments WHERE post_id = ${postId}`;
```

- **影響**: データベースの完全な制御
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 14.2 XSS - HTMLの保存

- **脆弱性**: コメント内容をサニタイズせずに保存
- **影響**: 保存型XSS攻撃
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-79

#### 14.3 認証チェックなし

- **脆弱性**: 認証なしでコメント投稿可能
- **影響**: スパム投稿
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-306

---

### 15. backend/src/routes/uploads.js

#### 15.1 ファイルタイプ検証の欠如

- **脆弱性**: すべてのファイルタイプを許可
- **影響**: 悪意のあるファイルのアップロード
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-434

#### 15.2 ファイルサイズ制限なし

- **脆弱性**: 大きなファイルのアップロードを許可
- **影響**: DoS攻撃
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-400

#### 15.3 ファイル名のサニタイズなし

- **脆弱性**: 元のファイル名をそのまま使用

```javascript
const filename = file.originalname;
```

- **影響**: パストラバーサル攻撃
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-22

#### 15.4 認証チェックなし

- **脆弱性**: 認証なしでファイルアップロード可能
- **影響**: ストレージの悪用
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-306

#### 15.5 実行可能ファイルの許可

- **脆弱性**: .exe、.sh、.phpなどを許可
- **影響**: リモートコード実行
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-94

---

### 16. backend/src/routes/admin.js

#### 16.1 弱い権限チェック

- **脆弱性**: クライアントから送信されたroleを信頼

```javascript
if (req.body.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
}
```

- **影響**: 権限昇格
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-639

#### 16.2 SQLインジェクション

- **脆弱性**: ユーザーIDを直接SQLに埋め込み

```javascript
const query = `DELETE FROM users WHERE id = ${userId}`;
```

- **影響**: データベースの完全な制御
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 16.3 カスケード削除なし

- **脆弱性**: 関連データを削除しない
- **影響**: データの不整合
- **OWASP**: A04:2021 - Insecure Design
- **CWE**: CWE-404

---

### 17. backend/src/routes/search.js

#### 17.1 SQLインジェクション

- **脆弱性**: 検索クエリを直接SQLに埋め込み

```javascript
const query = `
    SELECT * FROM posts 
    WHERE title LIKE '%${searchQuery}%' 
    OR content LIKE '%${searchQuery}%'
`;
```

- **影響**: データベースの完全な制御
- **OWASP**: A03:2021 - Injection
- **CWE**: CWE-89

#### 17.2 認証チェックなし

- **脆弱性**: 認証なしで検索可能
- **影響**: 情報漏洩
- **OWASP**: A01:2021 - Broken Access Control
- **CWE**: CWE-306

---

## データベース脆弱性

### 18. database/init.sql

#### 18.1 平文パスワードの保存

- **脆弱性**: 一部のユーザーのパスワードが平文

```sql
INSERT INTO users (username, password) 
VALUES ('admin', 'admin123');
```

- **影響**: パスワードの漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-256

#### 18.2 機密情報の保存

- **脆弱性**: SSN、クレジットカード番号を平文で保存

```sql
ssn VARCHAR(11),
credit_card VARCHAR(16)
```

- **影響**: 個人情報の漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-311

#### 18.3 弱いデフォルト認証情報

- **脆弱性**: 簡単に推測できる認証情報

```sql
VALUES ('admin', 'admin123', 'admin@example.com', 'admin');
```

- **影響**: 不正アクセス
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-798

---

## インフラストラクチャ脆弱性

### 19. docker-compose.yml

#### 19.1 環境変数の平文保存

- **脆弱性**: 認証情報を平文で記述

```yaml
environment:
  - DB_PASSWORD=insecure_password_123
  - JWT_SECRET=weak_secret_key
```

- **影響**: 認証情報の漏洩
- **OWASP**: A02:2021 - Cryptographic Failures
- **CWE**: CWE-798

#### 19.2 弱いデータベースパスワード

- **脆弱性**: 簡単に推測できるパスワード
- **影響**: データベースへの不正アクセス
- **OWASP**: A07:2021 - Identification and Authentication Failures
- **CWE**: CWE-521

#### 19.3 デフォルトポートの使用

- **脆弱性**: 標準ポートを使用
- **影響**: ポートスキャンで発見されやすい
- **OWASP**: A05:2021 - Security Misconfiguration
- **CWE**: CWE-16

---

## 脆弱性の統計

### OWASP Top 10 (2021) 分類

| カテゴリ | 脆弱性数 |
|---------|---------|
| A01:2021 - Broken Access Control | 15 |
| A02:2021 - Cryptographic Failures | 18 |
| A03:2021 - Injection | 20 |
| A04:2021 - Insecure Design | 8 |
| A05:2021 - Security Misconfiguration | 12 |
| A07:2021 - Identification and Authentication Failures | 14 |
| A09:2021 - Security Logging and Monitoring Failures | 13 |

**合計**: 100以上の脆弱性

### 深刻度別

| 深刻度 | 脆弱性数 |
|--------|---------|
| Critical | 25 |
| High | 35 |
| Medium | 30 |
| Low | 10+ |

---

## ペネトレーションテストの推奨事項

### 1. 自動スキャン

- **OWASP ZAP**: XSS、SQLインジェクションの検出
- **Burp Suite**: 包括的な脆弱性スキャン
- **SQLMap**: SQLインジェクションの自動検出

### 2. 手動テスト

- **認証バイパス**: `admin' OR '1'='1`でログイン
- **権限昇格**: 登録時に`role=admin`を指定
- **XSS攻撃**: `<script>alert('XSS')</script>`を投稿
- **SQLインジェクション**: 検索で`' OR '1'='1`を入力
- **CSRF攻撃**: 外部サイトからAPIを呼び出し

### 3. ツール

- **Metasploit**: エクスプロイトフレームワーク
- **Nmap**: ポートスキャン
- **Wireshark**: ネットワークトラフィック解析

---

## 修正方法（secure-appで実装予定）

### 1. 入力検証

- すべてのユーザー入力をサニタイズ
- パラメータ化クエリの使用
- ホワイトリスト方式の検証

### 2. 認証・認可

- 強力なパスワードポリシー
- MFA（多要素認証）の実装
- JWTの適切な管理
- サーバー側での権限チェック

### 3. 暗号化

- 機密情報の暗号化
- HTTPS の強制
- 強力な秘密鍵の使用

### 4. セキュリティヘッダー

- CSP の実装
- HSTS の有効化
- X-Frame-Options の設定

### 5. レート制限

- ログイン試行回数の制限
- API リクエストの制限

### 6. ログとモニタリング

- セキュリティイベントのログ記録
- 異常検知システムの実装

---

## 参考資料

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

---

**作成日**: 2026-01-03  
**バージョン**: 1.0  
**作成者**: Bob (AI Assistant)
