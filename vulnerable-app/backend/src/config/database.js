/**
 * データベース接続設定
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 */

const { Pool } = require('pg');
const { MongoClient } = require('mongodb');

// ===== 脆弱性: 接続情報のハードコーディング =====
// 環境変数を使用しているが、デフォルト値として機密情報をハードコード

// PostgreSQL接続プール
const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'vulnapp',
    password: process.env.DB_PASSWORD || 'insecure_password_123', // ハードコードされたパスワード
    database: process.env.DB_NAME || 'vulnerable_app',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    // ===== 脆弱性: SSL/TLS接続の無効化 =====
    ssl: false
});

// PostgreSQL接続エラーハンドリング
pgPool.on('error', (err, client) => {
    // ===== 脆弱性: 詳細なエラーログ =====
    console.error('Unexpected error on idle PostgreSQL client', err);
    console.error('Client details:', client);
    console.error('Connection string:', `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});

// MongoDB接続
const mongoUrl = `mongodb://${process.env.MONGO_USER || 'vulnapp'}:${process.env.MONGO_PASSWORD || 'insecure_password_123'}@${process.env.MONGO_HOST || 'localhost'}:${process.env.MONGO_PORT || 27017}`;
const mongoClient = new MongoClient(mongoUrl, {
    // ===== 脆弱性: 安全でない接続オプション =====
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: false,
    authSource: 'admin'
});

let mongoDb = null;

// MongoDB接続関数
async function connectMongo() {
    try {
        await mongoClient.connect();
        mongoDb = mongoClient.db(process.env.MONGO_DB || 'vulnerable_app');
        console.log('✅ MongoDB connected successfully');
        // ===== 脆弱性: 接続情報のログ出力 =====
        console.log('MongoDB URL:', mongoUrl);
    } catch (error) {
        // ===== 脆弱性: 詳細なエラー情報の露出 =====
        console.error('❌ MongoDB connection error:', error);
        console.error('Connection URL:', mongoUrl);
        throw error;
    }
}

// MongoDB接続の取得
function getMongoDb() {
    if (!mongoDb) {
        throw new Error('MongoDB not connected. Call connectMongo() first.');
    }
    return mongoDb;
}

// ===== 脆弱性: SQLインジェクションに脆弱なクエリヘルパー =====
// パラメータ化されていない生のSQLクエリを実行
async function executeRawQuery(query, logQuery = true) {
    const client = await pgPool.connect();
    try {
        if (logQuery) {
            // ===== 脆弱性: SQLクエリのログ出力 =====
            console.log('Executing SQL query:', query);
        }
        const result = await client.query(query);
        return result;
    } catch (error) {
        // ===== 脆弱性: SQLエラーの詳細な露出 =====
        console.error('SQL Error:', error);
        console.error('Failed query:', query);
        throw error;
    } finally {
        client.release();
    }
}

// パラメータ化されたクエリ（安全な方法）
async function executeQuery(query, params = []) {
    const client = await pgPool.connect();
    try {
        // ===== 脆弱性: クエリとパラメータのログ出力 =====
        console.log('Executing parameterized query:', query);
        console.log('Parameters:', params);

        const result = await client.query(query, params);
        return result;
    } catch (error) {
        console.error('SQL Error:', error);
        console.error('Failed query:', query);
        console.error('Parameters:', params);
        throw error;
    } finally {
        client.release();
    }
}

// トランザクション開始
async function beginTransaction() {
    const client = await pgPool.connect();
    await client.query('BEGIN');
    return client;
}

// トランザクションコミット
async function commitTransaction(client) {
    try {
        await client.query('COMMIT');
    } finally {
        client.release();
    }
}

// トランザクションロールバック
async function rollbackTransaction(client) {
    try {
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }
}

// データベース接続のテスト
async function testConnections() {
    console.log('Testing database connections...');

    // PostgreSQL接続テスト
    try {
        const pgResult = await executeQuery('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ PostgreSQL connection successful');
        console.log('   Time:', pgResult.rows[0].current_time);
        console.log('   Version:', pgResult.rows[0].pg_version);
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error);
    }

    // MongoDB接続テスト
    try {
        await connectMongo();
        const collections = await mongoDb.listCollections().toArray();
        console.log('✅ MongoDB connection successful');
        console.log('   Collections:', collections.map(c => c.name).join(', '));
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
    }
}

// グレースフルシャットダウン
async function closeConnections() {
    console.log('Closing database connections...');

    try {
        await pgPool.end();
        console.log('✅ PostgreSQL connection closed');
    } catch (error) {
        console.error('❌ Error closing PostgreSQL connection:', error);
    }

    try {
        await mongoClient.close();
        console.log('✅ MongoDB connection closed');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error);
    }
}

// プロセス終了時の処理
process.on('SIGTERM', closeConnections);
process.on('SIGINT', closeConnections);

module.exports = {
    pgPool,
    mongoClient,
    connectMongo,
    getMongoDb,
    executeRawQuery,
    executeQuery,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    testConnections,
    closeConnections
};

// Made with Bob
