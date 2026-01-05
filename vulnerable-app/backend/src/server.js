/**
 * 脆弱なバックエンドサーバー（学習用）
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 * 本番環境では絶対に使用しないでください！
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const compression = require('compression');

// ルーターのインポート
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const uploadRoutes = require('./routes/uploads');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== 脆弱性1: 詳細なエラーメッセージの露出 =====
process.env.NODE_ENV = 'development'; // 常に開発モード

// ===== 脆弱性2: 緩いCORS設定 =====
app.use(cors({
    origin: '*', // すべてのオリジンを許可
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
}));

// ミドルウェアの設定
app.use(express.json({ limit: '50mb' })); // 大きなペイロードを許可
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());

// ===== 脆弱性3: 詳細なログ出力 =====
app.use(morgan('combined')); // すべてのリクエストを詳細にログ

// ===== 脆弱性4: 弱いセッション設定 =====
app.use(session({
    secret: 'weak_session_secret', // 弱い秘密鍵
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false, // HTTPSなしでも動作
        httpOnly: false, // JavaScriptからアクセス可能
        maxAge: 24 * 60 * 60 * 1000, // 24時間
        sameSite: 'none' // CSRF攻撃に脆弱
    }
}));

// ===== 脆弱性5: セキュリティヘッダーの欠如 =====
// Helmetを使用しない

// ===== 脆弱性6: レート制限なし =====
// レート制限を実装しない

// 静的ファイルの提供（アップロードされたファイル）
app.use('/uploads', express.static('uploads'));

// ===== 脆弱性7: デバッグ情報の露出 =====
app.use((req, res, next) => {
    console.log('=== Request Details ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('Cookies:', req.cookies);
    console.log('Session:', req.session);
    console.log('IP:', req.ip);
    console.log('======================');
    next();
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        // ===== 脆弱性8: 機密情報の露出 =====
        database: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD, // パスワードを露出
            database: process.env.DB_NAME
        },
        secrets: {
            jwtSecret: process.env.JWT_SECRET, // JWT秘密鍵を露出
            sessionSecret: process.env.SESSION_SECRET, // セッション秘密鍵を露出
            apiKey: process.env.API_KEY // APIキーを露出
        }
    });
});

// APIルートの設定
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);

// ===== 脆弱性9: 詳細なエラーハンドリング =====
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);

    // スタックトレースを含む詳細なエラー情報を返す
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            stack: err.stack, // スタックトレースを露出
            details: err.details || {},
            sql: err.sql || null, // SQLクエリを露出
            parameters: err.parameters || null, // パラメータを露出
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
            sqlMessage: err.sqlMessage
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            query: req.query,
            params: req.params
        },
        timestamp: new Date().toISOString()
    });
});

// 404エラーハンドリング
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`,
        availableRoutes: [
            '/api/auth/login',
            '/api/auth/register',
            '/api/users',
            '/api/posts',
            '/api/comments',
            '/api/uploads',
            '/api/admin',
            '/api/search'
        ]
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log('===========================================');
    console.log(`🚨 VULNERABLE APP SERVER STARTED 🚨`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log('===========================================');
    console.log('⚠️  WARNING: This server contains intentional security vulnerabilities!');
    console.log('⚠️  DO NOT use in production!');
    console.log('⚠️  For educational purposes only!');
    console.log('===========================================');
    console.log('Available endpoints:');
    console.log('  - GET  /health');
    console.log('  - POST /api/auth/login');
    console.log('  - POST /api/auth/register');
    console.log('  - GET  /api/users');
    console.log('  - GET  /api/posts');
    console.log('  - POST /api/posts');
    console.log('  - GET  /api/comments');
    console.log('  - POST /api/uploads');
    console.log('  - GET  /api/admin/users');
    console.log('  - GET  /api/search');
    console.log('===========================================');
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

module.exports = app;

// Made with Bob
