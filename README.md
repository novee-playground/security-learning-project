# セキュリティ学習プロジェクト

## 📚 プロジェクト概要

このプロジェクトは、WEBアプリケーションのセキュリティテスト（ペネトレーションテスト・セキュリティ監査）を実践的に学ぶための教材です。

**対象者**: 実務経験のある上級者で、セキュリティスキルを体系的に習得したい方

**技術スタック**:

- バックエンド: Node.js + Express + PostgreSQL + MongoDB
- フロントエンド: React 18
- コンテナ: Docker + Docker Compose
- テストツール: OWASP ZAP, Burp Suite, SQLMap, Nikto

## 🎯 学習目標

1. **ペネトレーションテストスキル**
   - 脆弱性の発見と悪用方法の理解
   - プロフェッショナルツールの実践的な使用
   - 攻撃者の視点でのシステム評価

2. **セキュリティ監査スキル**
   - 体系的なセキュリティ評価手法
   - 脆弱性の優先順位付け
   - 詳細な監査レポートの作成

3. **セキュアコーディングスキル**
   - 脆弱性の根本原因の理解
   - 防御的プログラミング技法
   - セキュリティベストプラクティスの適用

## 📁 プロジェクト構造

```
security-learning-project/
├── vulnerable-app/          # 脆弱なアプリケーション（学習用）
│   ├── backend/            # Node.js/Express + PostgreSQL
│   ├── frontend/           # React
│   └── docker-compose.yml  # 環境構築
├── security-tests/         # テストスクリプトとレポート
│   ├── penetration/        # ペネトレーションテスト
│   ├── audit/              # セキュリティ監査
│   └── reports/            # テスト結果レポート
├── secure-app/             # 修正後のセキュアなアプリケーション
└── documentation/          # 学習ドキュメント
    ├── vulnerabilities/    # 脆弱性の詳細説明
    ├── testing-guides/     # テスト手法ガイド
    └── best-practices/     # ベストプラクティス
```

## 🔐 学習する脆弱性（OWASP Top 10ベース）

### 1. 認証・認可の不備

- 弱いパスワードポリシー
- セッション管理の不備
- JWT の不適切な実装
- 権限昇格の脆弱性

### 2. インジェクション攻撃

- **SQLインジェクション**: パラメータ化されていないクエリ
- **NoSQLインジェクション**: MongoDBクエリの不適切な構築
- **コマンドインジェクション**: OSコマンドの直接実行

### 3. XSS（クロスサイトスクリプティング）

- **Stored XSS**: データベースに保存される悪意のあるスクリプト
- **Reflected XSS**: URLパラメータを介した攻撃
- **DOM-based XSS**: クライアント側のJavaScriptの脆弱性

### 4. CSRF（クロスサイトリクエストフォージェリ）

- CSRFトークンの欠如
- SameSite Cookie属性の不適切な設定

### 5. セキュリティ設定ミス

- デフォルト認証情報の使用
- 詳細なエラーメッセージの露出
- CORSの不適切な設定
- セキュリティヘッダーの欠如

### 6. 機密データの露出

- 暗号化されていないデータ転送
- 不適切なデータマスキング
- ログへの機密情報の記録

### 7. APIセキュリティの問題

- レート制限の欠如
- 不適切な入力検証
- 過度なデータ露出

## 🛠️ セットアップ手順

### 前提条件

- Node.js 18以上
- Docker & Docker Compose
- Git

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd security-learning-project
```

### 2. 脆弱なアプリケーションの起動

```bash
cd vulnerable-app
docker-compose up -d
```

これにより以下のサービスが起動します：

- **フロントエンド**: <http://localhost:3001>
- **バックエンドAPI**: <http://localhost:3000>
- **PostgreSQL**: localhost:5432
- **MongoDB**: localhost:27017
- **Adminer** (DB管理): <http://localhost:8080>

### 3. アプリケーションの動作確認

ブラウザで <http://localhost:3001> にアクセスし、以下のテストユーザーでログインできます：

- **管理者**: `admin` / `admin123`
- **一般ユーザー**: `user1` / `password123`
- **ゲスト**: `guest` / `guest`

### 4. コンテナの停止

```bash
docker-compose down
```

### 2. セキュリティテストツールのインストール

#### OWASP ZAP（推奨）

```bash
# macOS
brew install --cask owasp-zap

# または公式サイトからダウンロード
# https://www.zaproxy.org/download/
```

#### Burp Suite Community Edition

```bash
# 公式サイトからダウンロード
# https://portswigger.net/burp/communitydownload
```

#### SQLMap

```bash
# macOS
brew install sqlmap

# または
pip install sqlmap
```

#### Nikto

```bash
# macOS
brew install nikto
```

## 📖 学習の進め方

### フェーズ1: 脆弱なアプリケーションの理解（1-2日）

1. アプリケーションの機能を確認
2. ソースコードを読み、意図的に埋め込まれた脆弱性を特定
3. 各脆弱性がどのように悪用されるかを理解

### フェーズ2: ペネトレーションテストの実践（3-5日）

1. OWASP ZAPで自動スキャン実施
2. Burp Suiteで手動テスト実施
3. 各脆弱性に対する攻撃を実際に試行
4. 攻撃の成功/失敗を記録

### フェーズ3: セキュリティ監査（2-3日）

1. 体系的なセキュリティ評価の実施
2. 脆弱性の優先順位付け（CVSS スコアリング）
3. 詳細な監査レポートの作成

### フェーズ4: 脆弱性の修正（3-5日）

1. 検出した脆弱性を一つずつ修正
2. セキュアコーディングのベストプラクティスを適用
3. 修正後のコードレビュー

### フェーズ5: 再テストと検証（2-3日）

1. 修正後のアプリケーションに対して再テスト
2. 脆弱性が適切に修正されたことを確認
3. 新たな脆弱性が導入されていないことを確認

### フェーズ6: 自動化とCI/CD統合（2-3日）

1. セキュリティテストの自動化スクリプト作成
2. CI/CDパイプラインへの統合
3. 継続的なセキュリティテストの実装

## 📝 ドキュメント

### 主要ドキュメント

- **[VULNERABILITIES.md](./VULNERABILITIES.md)**: 埋め込まれた100以上の脆弱性の詳細リスト
  - OWASP Top 10分類
  - CWE番号
  - 攻撃手法
  - 修正方法

### 今後追加予定

- `documentation/testing-guides/`: ツールの使用方法とテスト手順
- `documentation/best-practices/`: セキュアコーディングのベストプラクティス
- `security-tests/reports/`: ペネトレーションテスト結果レポート

## ⚠️ 重要な注意事項

### 倫理的な使用について

このプロジェクトは**教育目的のみ**で作成されています：

1. **許可されていないシステムに対して絶対にテストを実行しないでください**
2. このプロジェクトで学んだ技術は、自分が所有または明示的な許可を得たシステムにのみ使用してください
3. 脆弱性を発見した場合は、責任を持って開示してください
4. 法律と倫理規定を常に遵守してください

### 学習環境の隔離

- このプロジェクトは隔離された環境（ローカルマシンまたは専用のテスト環境）で実行してください
- 本番環境やインターネットに公開されたシステムでは使用しないでください
- Dockerコンテナを使用して環境を隔離することを推奨します

## 🎓 学習リソース

### 推奨書籍

- 「体系的に学ぶ 安全なWebアプリケーションの作り方」徳丸浩
- 「The Web Application Hacker's Handbook」
- 「OWASP Testing Guide」

### オンラインリソース

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [HackerOne Hacktivity](https://hackerone.com/hacktivity)

### 練習プラットフォーム

- [OWASP WebGoat](https://owasp.org/www-project-webgoat/)
- [DVWA (Damn Vulnerable Web Application)](https://github.com/digininja/DVWA)
- [HackTheBox](https://www.hackthebox.com/)

## 📊 実装済み機能

### ✅ 完了

- [x] 脆弱なバックエンドAPI（Node.js + Express）
- [x] 脆弱なフロントエンド（React 18）
- [x] Docker環境構築
- [x] PostgreSQLデータベース
- [x] MongoDBデータベース
- [x] 100以上の脆弱性の埋め込み
- [x] 脆弱性ドキュメント（VULNERABILITIES.md）
- [x] 基本的なユーザー認証機能
- [x] 投稿・コメント機能
- [x] ファイルアップロード機能
- [x] 検索機能
- [x] 管理者機能

### 🚧 今後の実装予定

- [ ] セキュリティテストスクリプト
- [ ] ペネトレーションテストレポート
- [ ] セキュアなアプリケーション（secure-app）
- [ ] CI/CD統合
- [ ] 自動化テストスイート

## 🤝 貢献

このプロジェクトは学習目的で作成されていますが、改善提案は歓迎します。

## 📄 ライセンス

このプロジェクトは教育目的で作成されています。商用利用は禁止されています。

---

## 🔍 クイックスタートガイド

### 1. 環境起動（5分）

```bash
cd vulnerable-app
docker-compose up -d
```

### 2. アプリケーションにアクセス

- フロントエンド: <http://localhost:3001>
- バックエンドAPI: <http://localhost:3000>
- Adminer: <http://localhost:8080>

### 3. ログイン

ユーザー名: `admin`
パスワード: `admin123`

### 4. 脆弱性を試す

#### SQLインジェクション

検索フィールドに以下を入力：

```
' OR '1'='1
```

#### XSS攻撃

新規投稿で以下を入力：

```html
<script>alert('XSS')</script>
```

#### 権限昇格

ユーザー登録時にブラウザの開発者ツールで以下を追加：

```json
{
  "username": "hacker",
  "email": "hacker@example.com",
  "password": "test123",
  "role": "admin"
}
```

### 5. 脆弱性の詳細を確認

[VULNERABILITIES.md](./VULNERABILITIES.md) を参照してください。

---

**作成日**: 2026-01-03
**最終更新**: 2026-01-03
**バージョン**: 1.0.0
**作成者**: Bob (AI Assistant)
