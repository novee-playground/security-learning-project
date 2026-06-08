FROM node:18-alpine

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# CRA dev server needs these to run inside a container / cluster
ENV HOST=0.0.0.0 \
    PORT=3000 \
    CI=true \
    DANGEROUSLY_DISABLE_HOST_CHECK=true \
    WDS_SOCKET_HOST=0.0.0.0

# ポート3000を公開
EXPOSE 3000

# 開発サーバーを起動
CMD ["npm", "start"]

# Made with Bob