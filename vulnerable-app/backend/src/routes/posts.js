/**
 * 投稿管理ルート（脆弱性あり - 学習用）
 * 
 * 含まれる脆弱性:
 * 1. XSS (Stored/Reflected)
 * 2. SQLインジェクション
 * 3. CSRF
 * 4. 不適切な認可
 * 5. HTMLインジェクション
 * 6. 過度なデータ露出
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

// ===== 脆弱性1: 全投稿の取得（認証なし） =====
router.get('/', async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        const offset = (page - 1) * limit;

        // SQLインジェクション脆弱性
        const query = `
            SELECT 
                p.*,
                u.username,
                u.email,
                u.role
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        console.log('Posts query:', query);

        const result = await pool.query(query);

        // XSS脆弱性: サニタイズせずにコンテンツを返す
        res.json({
            success: true,
            count: result.rows.length,
            posts: result.rows,
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

// ===== 脆弱性2: 投稿の詳細取得（SQLインジェクション） =====
router.get('/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        // SQLインジェクション脆弱性
        const query = `
            SELECT 
                p.*,
                u.username,
                u.email,
                u.role,
                u.created_at as user_created_at
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ${postId}
        `;

        console.log('Post detail query:', query);

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Post not found',
                query: query
            });
        }

        // XSS脆弱性: HTMLをそのまま返す
        res.json({
            success: true,
            post: result.rows[0],
            query: query
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql,
            hint: 'Try SQL injection: /api/posts/1 OR 1=1--'
        });
    }
});

// ===== 脆弱性3: 投稿作成（XSS + CSRF） =====
router.post('/', async (req, res) => {
    try {
        const { title, content, user_id, tags, is_published } = req.body;

        // 認証チェックなし
        // CSRFトークンチェックなし
        // 入力サニタイゼーションなし（XSS脆弱性）

        if (!title || !content || !user_id) {
            return res.status(400).json({
                error: 'Title, content, and user_id are required'
            });
        }

        // Stored XSS脆弱性: HTMLタグをそのまま保存
        const query = `
            INSERT INTO posts (title, content, user_id, tags, is_published)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await pool.query(query, [
            title,
            content, // サニタイズなし
            user_id,
            tags || [],
            is_published !== undefined ? is_published : true
        ]);

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: result.rows[0],
            warning: 'No XSS protection applied!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性4: 投稿更新（認可チェックなし + XSS） =====
router.put('/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const { title, content, tags, is_published } = req.body;

        // 認証チェックなし
        // 投稿の所有者確認なし（誰でも他人の投稿を編集可能）
        // CSRFトークンチェックなし

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (title) {
            updates.push(`title = $${paramCount++}`);
            values.push(title);
        }
        if (content) {
            updates.push(`content = $${paramCount++}`);
            values.push(content); // XSS脆弱性
        }
        if (tags) {
            updates.push(`tags = $${paramCount++}`);
            values.push(tags);
        }
        if (is_published !== undefined) {
            updates.push(`is_published = $${paramCount++}`);
            values.push(is_published);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(postId);

        const query = `
            UPDATE posts 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({
            success: true,
            message: 'Post updated successfully',
            post: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性5: 投稿削除（認可チェックなし） =====
router.delete('/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        // 認証チェックなし
        // 投稿の所有者確認なし
        // CSRFトークンチェックなし

        const query = 'DELETE FROM posts WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [postId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({
            success: true,
            message: 'Post deleted successfully',
            deletedPost: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性6: 投稿検索（SQLインジェクション + XSS） =====
router.get('/search/query', async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        const searchType = req.query.type || 'title'; // title, content, tags

        // SQLインジェクション脆弱性
        let query;
        if (searchType === 'title') {
            query = `SELECT * FROM posts WHERE title LIKE '%${searchTerm}%'`;
        } else if (searchType === 'content') {
            query = `SELECT * FROM posts WHERE content LIKE '%${searchTerm}%'`;
        } else if (searchType === 'tags') {
            query = `SELECT * FROM posts WHERE '${searchTerm}' = ANY(tags)`;
        } else {
            query = `SELECT * FROM posts WHERE title LIKE '%${searchTerm}%' OR content LIKE '%${searchTerm}%'`;
        }

        console.log('Search query:', query);

        const result = await pool.query(query);

        // Reflected XSS脆弱性
        res.send(`
            <html>
            <head><title>Search Results</title></head>
            <body>
                <h1>Search Results for: ${searchTerm}</h1>
                <p>Found ${result.rows.length} posts</p>
                <pre>${JSON.stringify(result.rows, null, 2)}</pre>
                <p>Query executed: ${query}</p>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`
            <html>
            <body>
                <h1>Error</h1>
                <pre>${error.message}</pre>
                <pre>${error.stack}</pre>
            </body>
            </html>
        `);
    }
});

// ===== 脆弱性7: ユーザーの投稿一覧（SQLインジェクション） =====
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // SQLインジェクション脆弱性
        const query = `
            SELECT p.*, u.username, u.email
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ${userId}
            ORDER BY p.created_at DESC
        `;

        console.log('User posts query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            posts: result.rows,
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

// ===== 脆弱性8: 投稿の「いいね」機能（CSRF） =====
router.post('/:id/like', async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.body.user_id;

        // CSRFトークンチェックなし
        // 認証チェックなし
        // 重複チェックなし（同じユーザーが何度でもいいね可能）

        const query = `
            UPDATE posts 
            SET likes = likes + 1
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [postId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({
            success: true,
            message: 'Post liked successfully',
            post: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性9: 投稿の統計情報 =====
router.get('/stats/summary', async (req, res) => {
    try {
        const queries = {
            totalPosts: 'SELECT COUNT(*) as count FROM posts',
            publishedPosts: 'SELECT COUNT(*) as count FROM posts WHERE is_published = true',
            totalLikes: 'SELECT SUM(likes) as total FROM posts',
            topPosts: 'SELECT * FROM posts ORDER BY likes DESC LIMIT 10',
            recentPosts: 'SELECT * FROM posts ORDER BY created_at DESC LIMIT 10'
        };

        const results = {};

        for (const [key, query] of Object.entries(queries)) {
            const result = await pool.query(query);
            results[key] = result.rows;
        }

        res.json({
            success: true,
            stats: results,
            queries: queries
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性10: 投稿のプレビュー（DOM-based XSS） =====
router.post('/preview', async (req, res) => {
    try {
        const { title, content } = req.body;

        // HTMLをそのまま返す（XSS脆弱性）
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Post Preview</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .post { border: 1px solid #ccc; padding: 20px; }
                    .title { font-size: 24px; font-weight: bold; }
                    .content { margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="post">
                    <div class="title">${title}</div>
                    <div class="content">${content}</div>
                </div>
                <script>
                    // DOM-based XSS脆弱性
                    const urlParams = new URLSearchParams(window.location.search);
                    const message = urlParams.get('message');
                    if (message) {
                        document.body.innerHTML += '<div>' + message + '</div>';
                    }
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性11: タグによるフィルタリング（SQLインジェクション） =====
router.get('/filter/tags', async (req, res) => {
    try {
        const tag = req.query.tag || '';
        const operator = req.query.operator || 'AND'; // AND, OR

        // SQLインジェクション脆弱性
        const query = `
            SELECT * FROM posts 
            WHERE '${tag}' = ANY(tags)
            ${operator === 'OR' ? 'OR' : 'AND'} is_published = true
            ORDER BY created_at DESC
        `;

        console.log('Filter query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            posts: result.rows,
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