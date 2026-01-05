/**
 * ユーザー管理ルート（脆弱性あり - 学習用）
 * 
 * 含まれる脆弱性:
 * 1. SQLインジェクション
 * 2. 不適切な認可チェック
 * 3. 機密情報の露出
 * 4. IDOR (Insecure Direct Object Reference)
 * 5. 過度なデータ露出
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// データベース接続
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'vulnapp',
    password: process.env.DB_PASSWORD || 'insecure_password_123',
    database: process.env.DB_NAME || 'vulnerable_app'
});

// ===== 脆弱性1: 認証チェックなし =====
// すべてのエンドポイントが認証なしでアクセス可能

// ===== 脆弱性2: 全ユーザー情報の取得（機密情報含む） =====
router.get('/', async (req, res) => {
    try {
        // パスワードハッシュを含むすべての情報を返す
        const result = await pool.query('SELECT * FROM users');

        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows // パスワードハッシュ、メールアドレスなど全て露出
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性3: SQLインジェクション + IDOR =====
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // SQLインジェクション脆弱性
        const query = `SELECT * FROM users WHERE id = ${userId}`;
        console.log('Executing query:', query);

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found',
                query: query // クエリを露出
            });
        }

        // パスワードハッシュを含むすべての情報を返す
        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql,
            hint: 'Try SQL injection: /api/users/1 OR 1=1--'
        });
    }
});

// ===== 脆弱性4: SQLインジェクション（検索機能） =====
router.get('/search/username', async (req, res) => {
    try {
        const username = req.query.q || '';

        // SQLインジェクション脆弱性
        const query = `SELECT * FROM users WHERE username LIKE '%${username}%'`;
        console.log('Search query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows,
            query: query // クエリを露出
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性5: 不適切な更新権限 =====
router.put('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email, role, is_active } = req.body;

        // 認証チェックなし
        // 誰でも任意のユーザー情報を更新可能
        // roleやis_activeも更新可能（権限昇格の脆弱性）

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (username) {
            updates.push(`username = $${paramCount++}`);
            values.push(username);
        }
        if (email) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (role) {
            updates.push(`role = $${paramCount++}`);
            values.push(role);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(userId);

        const query = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        console.log('Update query:', query);
        console.log('Values:', values);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性6: パスワード変更（認証なし） =====
router.put('/:id/password', async (req, res) => {
    try {
        const userId = req.params.id;
        const { newPassword } = req.body;

        // 認証チェックなし
        // 現在のパスワード確認なし
        // 誰でも任意のユーザーのパスワードを変更可能

        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }

        // パスワードの強度チェックなし
        // ハッシュ化せずに保存（超危険！）
        const query = `
            UPDATE users 
            SET password = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, username, email
        `;

        const result = await pool.query(query, [newPassword, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'Password updated successfully',
            user: result.rows[0],
            newPassword: newPassword // パスワードを平文で返す
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性7: ユーザー削除（認証なし） =====
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // 認証チェックなし
        // 誰でも任意のユーザーを削除可能

        const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User deleted successfully',
            deletedUser: result.rows[0] // 削除されたユーザー情報を返す
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性8: ユーザー統計情報の露出 =====
router.get('/stats/summary', async (req, res) => {
    try {
        const queries = {
            totalUsers: 'SELECT COUNT(*) as count FROM users',
            activeUsers: 'SELECT COUNT(*) as count FROM users WHERE is_active = true',
            adminUsers: 'SELECT COUNT(*) as count FROM users WHERE role = \'admin\'',
            recentUsers: 'SELECT * FROM users ORDER BY created_at DESC LIMIT 10',
            usersByRole: 'SELECT role, COUNT(*) as count FROM users GROUP BY role'
        };

        const results = {};

        for (const [key, query] of Object.entries(queries)) {
            const result = await pool.query(query);
            results[key] = result.rows;
        }

        res.json({
            success: true,
            stats: results,
            queries: queries // クエリを露出
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性9: SQLインジェクション（複雑なクエリ） =====
router.post('/advanced-search', async (req, res) => {
    try {
        const { username, email, role, orderBy, limit } = req.body;

        let query = 'SELECT * FROM users WHERE 1=1';

        if (username) {
            query += ` AND username LIKE '%${username}%'`;
        }
        if (email) {
            query += ` AND email LIKE '%${email}%'`;
        }
        if (role) {
            query += ` AND role = '${role}'`;
        }
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }
        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        console.log('Advanced search query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            users: result.rows,
            query: query // クエリを露出
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql,
            hint: 'Try SQL injection in orderBy or other fields'
        });
    }
});

// ===== 脆弱性10: ユーザーのアクティビティログ（機密情報含む） =====
router.get('/:id/activity', async (req, res) => {
    try {
        const userId = req.params.id;

        // SQLインジェクション脆弱性
        const query = `
            SELECT 
                u.*,
                p.id as post_id,
                p.title as post_title,
                p.content as post_content,
                c.id as comment_id,
                c.content as comment_content
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN comments c ON u.id = c.user_id
            WHERE u.id = ${userId}
        `;

        console.log('Activity query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            activity: result.rows,
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

module.exports = router;

// Made with Bob