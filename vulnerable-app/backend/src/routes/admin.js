/**
 * 管理者ルート（脆弱性あり - 学習用）
 * 
 * 含まれる脆弱性:
 * 1. 権限昇格
 * 2. 不適切な認可チェック
 * 3. IDOR (Insecure Direct Object Reference)
 * 4. SQLインジェクション
 * 5. 機密情報の露出
 * 6. コマンドインジェクション
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// データベース接続
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'vulnapp',
    password: process.env.DB_PASSWORD || 'insecure_password_123',
    database: process.env.DB_NAME || 'vulnerable_app'
});

// ===== 脆弱性1: 認証・認可チェックなし =====
// すべての管理者エンドポイントが認証なしでアクセス可能

// ===== 脆弱性2: 全ユーザー情報の取得（機密情報含む） =====
router.get('/users', async (req, res) => {
    try {
        // 管理者権限チェックなし
        const query = `
            SELECT 
                id,
                username,
                email,
                password, -- パスワードハッシュを露出
                role,
                is_active,
                created_at,
                updated_at,
                last_login
            FROM users
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows,
            warning: 'Password hashes exposed! No authorization check!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性3: ユーザーの権限変更（認可チェックなし） =====
router.put('/users/:id/role', async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        // 管理者権限チェックなし
        // 誰でも任意のユーザーの権限を変更可能（権限昇格の脆弱性）

        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        const query = `
            UPDATE users 
            SET role = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [role, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User role updated successfully',
            user: result.rows[0],
            warning: 'No authorization check! Anyone can become admin!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性4: ユーザーの有効/無効化（認可チェックなし） =====
router.put('/users/:id/status', async (req, res) => {
    try {
        const userId = req.params.id;
        const { is_active } = req.body;

        // 管理者権限チェックなし

        if (is_active === undefined) {
            return res.status(400).json({ error: 'is_active is required' });
        }

        const query = `
            UPDATE users 
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [is_active, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User status updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性5: ユーザーの完全削除（認可チェックなし） =====
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // 管理者権限チェックなし
        // カスケード削除の確認なし

        const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User permanently deleted',
            deletedUser: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性6: システム情報の露出 =====
router.get('/system/info', (req, res) => {
    try {
        // 管理者権限チェックなし
        // 機密情報を露出

        res.json({
            success: true,
            system: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpuUsage: process.cpuUsage(),
                env: process.env, // 環境変数を全て露出（超危険！）
                cwd: process.cwd(),
                execPath: process.execPath,
                argv: process.argv
            },
            warning: 'All environment variables exposed including secrets!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性7: データベース情報の露出 =====
router.get('/database/info', async (req, res) => {
    try {
        // 管理者権限チェックなし

        const queries = {
            version: 'SELECT version()',
            currentUser: 'SELECT current_user',
            currentDatabase: 'SELECT current_database()',
            tables: `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `,
            columns: `
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position
            `
        };

        const results = {};

        for (const [key, query] of Object.entries(queries)) {
            const result = await pool.query(query);
            results[key] = result.rows;
        }

        res.json({
            success: true,
            database: results,
            connection: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD, // パスワードを露出
                database: process.env.DB_NAME
            },
            warning: 'Database credentials exposed!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性8: SQLクエリの直接実行（超危険！） =====
router.post('/database/query', async (req, res) => {
    try {
        const { query } = req.body;

        // 管理者権限チェックなし
        // SQLインジェクション脆弱性
        // 任意のSQLクエリを実行可能

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        console.log('Executing custom query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            query: query,
            rowCount: result.rowCount,
            rows: result.rows,
            fields: result.fields,
            warning: 'Direct SQL execution enabled! Extremely dangerous!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性9: コマンドインジェクション =====
router.post('/system/command', (req, res) => {
    try {
        const { command } = req.body;

        // 管理者権限チェックなし
        // コマンドインジェクション脆弱性
        // 任意のOSコマンドを実行可能

        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }

        console.log('Executing system command:', command);

        // 超危険：任意のコマンドを実行
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({
                    error: error.message,
                    stderr: stderr,
                    command: command
                });
            }

            res.json({
                success: true,
                command: command,
                stdout: stdout,
                stderr: stderr,
                warning: 'Command injection vulnerability! Try: ls -la; cat /etc/passwd'
            });
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性10: ファイルシステムの操作 =====
router.get('/files/read', (req, res) => {
    try {
        const { path: filePath } = req.query;

        // 管理者権限チェックなし
        // パストラバーサル脆弱性

        if (!filePath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        console.log('Reading file:', filePath);

        // 任意のファイルを読み取り可能
        const content = fs.readFileSync(filePath, 'utf8');

        res.json({
            success: true,
            path: filePath,
            content: content,
            warning: 'Path traversal vulnerability! Try: /etc/passwd'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性11: ログファイルの表示 =====
router.get('/logs', (req, res) => {
    try {
        const logType = req.query.type || 'application';
        const lines = req.query.lines || 100;

        // 管理者権限チェックなし

        let logPath;
        if (logType === 'application') {
            logPath = path.join(__dirname, '../../logs/app.log');
        } else if (logType === 'error') {
            logPath = path.join(__dirname, '../../logs/error.log');
        } else if (logType === 'access') {
            logPath = path.join(__dirname, '../../logs/access.log');
        } else {
            // パストラバーサル脆弱性
            logPath = logType;
        }

        console.log('Reading log file:', logPath);

        if (!fs.existsSync(logPath)) {
            return res.status(404).json({
                error: 'Log file not found',
                path: logPath
            });
        }

        const content = fs.readFileSync(logPath, 'utf8');
        const logLines = content.split('\n').slice(-lines);

        res.json({
            success: true,
            logType: logType,
            path: logPath,
            lines: logLines,
            totalLines: logLines.length
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性12: データベースのバックアップ =====
router.post('/database/backup', (req, res) => {
    try {
        const { filename } = req.body;

        // 管理者権限チェックなし
        // コマンドインジェクション脆弱性

        const backupFile = filename || `backup_${Date.now()}.sql`;
        const command = `pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} > /tmp/${backupFile}`;

        console.log('Backup command:', command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({
                    error: error.message,
                    stderr: stderr
                });
            }

            res.json({
                success: true,
                message: 'Database backup created',
                filename: backupFile,
                path: `/tmp/${backupFile}`,
                command: command
            });
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性13: 統計情報（SQLインジェクション） =====
router.get('/stats', async (req, res) => {
    try {
        const table = req.query.table || 'users';
        const column = req.query.column || '*';

        // 管理者権限チェックなし
        // SQLインジェクション脆弱性

        const query = `SELECT COUNT(${column}) as count FROM ${table}`;

        console.log('Stats query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            table: table,
            column: column,
            count: result.rows[0].count,
            query: query
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性14: セッション管理 =====
router.get('/sessions', async (req, res) => {
    try {
        // 管理者権限チェックなし
        // すべてのアクティブセッションを表示

        const query = `
            SELECT 
                id,
                user_id,
                token,
                ip_address,
                user_agent,
                created_at,
                expires_at
            FROM sessions
            WHERE expires_at > NOW()
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            sessions: result.rows,
            warning: 'All session tokens exposed!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            hint: 'sessions table may not exist yet'
        });
    }
});

// ===== 脆弱性15: セッションの強制終了 =====
router.delete('/sessions/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;

        // 管理者権限チェックなし
        // 任意のユーザーのセッションを終了可能

        const query = 'DELETE FROM sessions WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [sessionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            success: true,
            message: 'Session terminated',
            session: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;

// Made with Bob