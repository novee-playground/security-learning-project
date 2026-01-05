FROM node:18-alpine

# ビルドツールのインストール（bcryptのネイティブモジュールビルド用）
RUN apk add --no-cache python3 make g++

# 作業ディレクトリの設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# ポート3000を公開
EXPOSE 3000

# アプリケーションの起動
CMD ["npm", "run", "dev"]