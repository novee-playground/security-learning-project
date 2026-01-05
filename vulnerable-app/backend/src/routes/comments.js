/**
 * コメント管理ルート（脆弱性あり - 学習用）
 * 
 * 含まれる脆弱性:
 * 1. Stored XSS
 * 2. SQLインジェクション
 * 3. CSRF
 * 4. 不適切な認可
 * 5. レート制限なし
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

// ===== 脆弱性1: 全コメントの取得 =====
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*,
                u.username,
                u.email,
                p.title as post_title
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN posts p ON c.post_id = p.id
            ORDER BY c.created_at DESC
        `;

        const result = await pool.query(query);

        // XSS脆弱性: サニタイズせずにコンテンツを返す
        res.json({
            success: true,
            count: result.rows.length,
            comments: result.rows
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性2: 投稿のコメント取得（SQLインジェクション） =====
router.get('/post/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;

        // SQLインジェクション脆弱性
        const query = `
            SELECT 
                c.*,
                u.username,
                u.email,
                u.role
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ${postId}
            ORDER BY c.created_at ASC
        `;

        console.log('Comments query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            comments: result.rows,
            query: query
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql,
            hint: 'Try SQL injection: /api/comments/post/1 OR 1=1--'
        });
    }
});

// ===== 脆弱性3: コメント作成（Stored XSS + CSRF） =====
router.post('/', async (req, res) => {
    try {
        const { post_id, user_id, content, parent_id } = req.body;

        // 認証チェックなし
        // CSRFトークンチェックなし
        // レート制限なし（スパム可能）
        // 入力サニタイゼーションなし（Stored XSS脆弱性）

        if (!post_id || !user_id || !content) {
            return res.status(400).json({
                error: 'post_id, user_id, and content are required'
            });
        }

        // Stored XSS脆弱性: HTMLタグをそのまま保存
        const query = `
            INSERT INTO comments (post_id, user_id, content, parent_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await pool.query(query, [
            post_id,
            user_id,
            content, // サニタイズなし
            parent_id || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Comment created successfully',
            comment: result.rows[0],
            warning: 'No XSS protection applied! Try: <script>alert("XSS")</script>'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性4: コメント更新（認可チェックなし + XSS） =====
router.put('/:id', async (req, res) => {
    try {
        const commentId = req.params.id;
        const { content } = req.body;

        // 認証チェックなし
        // コメントの所有者確認なし（誰でも他人のコメントを編集可能）
        // CSRFトークンチェックなし

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // XSS脆弱性
        const query = `
            UPDATE comments 
            SET content = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        const result = await pool.query(query, [content, commentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.json({
            success: true,
            message: 'Comment updated successfully',
            comment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性5: コメント削除（認可チェックなし） =====
router.delete('/:id', async (req, res) => {
    try {
        const commentId = req.params.id;

        // 認証チェックなし
        // コメントの所有者確認なし
        // CSRFトークンチェックなし

        const query = 'DELETE FROM comments WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [commentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.json({
            success: true,
            message: 'Comment deleted successfully',
            deletedComment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性6: ユーザーのコメント一覧（SQLインジェクション） =====
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // SQLインジェクション脆弱性
        const query = `
            SELECT 
                c.*,
                p.title as post_title,
                p.id as post_id
            FROM comments c
            JOIN posts p ON c.post_id = p.id
            WHERE c.user_id = ${userId}
            ORDER BY c.created_at DESC
        `;

        console.log('User comments query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            comments: result.rows,
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

// ===== 脆弱性7: コメント検索（SQLインジェクション + Reflected XSS） =====
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q || '';

        // SQLインジェクション脆弱性
        const query = `
            SELECT 
                c.*,
                u.username,
                p.title as post_title
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN posts p ON c.post_id = p.id
            WHERE c.content LIKE '%${searchTerm}%'
            ORDER BY c.created_at DESC
        `;

        console.log('Search query:', query);

        const result = await pool.query(query);

        // Reflected XSS脆弱性
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Comment Search Results</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .comment { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>Search Results for: ${searchTerm}</h1>
                <p>Found ${result.rows.length} comments</p>
                <div>
                    ${result.rows.map(c => `
                        <div class="comment">
                            <strong>${c.username}</strong> on <em>${c.post_title}</em>
                            <p>${c.content}</p>
                        </div>
                    `).join('')}
                </div>
                <p>Query: ${query}</p>
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

// ===== 脆弱性8: コメントの「いいね」機能（CSRF + レート制限なし） =====
router.post('/:id/like', async (req, res) => {
    try {
        const commentId = req.params.id;

        // CSRFトークンチェックなし
        // 認証チェックなし
        // レート制限なし
        // 重複チェックなし

        const query = `
            UPDATE comments 
            SET likes = likes + 1
            WHERE id = $1
            RETURNING *
        `;

        const result = await pool.query(query, [commentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.json({
            success: true,
            message: 'Comment liked successfully',
            comment: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性9: ネストされたコメントの取得（SQLインジェクション） =====
router.get('/thread/:parentId', async (req, res) => {
    try {
        const parentId = req.params.parentId;

        // SQLインジェクション脆弱性
        const query = `
            WITH RECURSIVE comment_tree AS (
                SELECT *, 0 as level
                FROM comments
                WHERE id = ${parentId}
                
                UNION ALL
                
                SELECT c.*, ct.level + 1
                FROM comments c
                JOIN comment_tree ct ON c.parent_id = ct.id
            )
            SELECT 
                ct.*,
                u.username,
                u.email
            FROM comment_tree ct
            JOIN users u ON ct.user_id = u.id
            ORDER BY ct.level, ct.created_at
        `;

        console.log('Thread query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            thread: result.rows,
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

// ===== 脆弱性10: コメントの統計情報 =====
router.get('/stats/summary', async (req, res) => {
    try {
        const queries = {
            totalComments: 'SELECT COUNT(*) as count FROM comments',
            commentsToday: `
                SELECT COUNT(*) as count 
                FROM comments 
                WHERE created_at >= CURRENT_DATE
            `,
            topCommenters: `
                SELECT 
                    u.username,
                    u.email,
                    COUNT(c.id) as comment_count
                FROM users u
                JOIN comments c ON u.id = c.user_id
                GROUP BY u.id, u.username, u.email
                ORDER BY comment_count DESC
                LIMIT 10
            `,
            mostLikedComments: `
                SELECT 
                    c.*,
                    u.username,
                    p.title as post_title
                FROM comments c
                JOIN users u ON c.user_id = u.id
                JOIN posts p ON c.post_id = p.id
                ORDER BY c.likes DESC
                LIMIT 10
            `
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

// ===== 脆弱性11: コメントの一括削除（認可チェックなし） =====
router.post('/bulk-delete', async (req, res) => {
    try {
        const { comment_ids } = req.body;

        // 認証チェックなし
        // 所有者確認なし
        // CSRFトークンチェックなし

        if (!comment_ids || !Array.isArray(comment_ids)) {
            return res.status(400).json({ error: 'comment_ids array is required' });
        }

        // SQLインジェクション脆弱性
        const ids = comment_ids.join(',');
        const query = `DELETE FROM comments WHERE id IN (${ids}) RETURNING *`;

        console.log('Bulk delete query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            message: `${result.rows.length} comments deleted`,
            deletedComments: result.rows,
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

// ===== 脆弱性12: コメントのレポート機能（スパム可能） =====
router.post('/:id/report', async (req, res) => {
    try {
        const commentId = req.params.id;
        const { reason, reporter_id } = req.body;

        // レート制限なし
        // 認証チェックなし
        // 重複チェックなし（同じユーザーが何度でもレポート可能）

        const query = `
            INSERT INTO comment_reports (comment_id, reporter_id, reason)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [
            commentId,
            reporter_id || null,
            reason || 'No reason provided'
        ]);

        res.status(201).json({
            success: true,
            message: 'Comment reported successfully',
            report: result.rows[0]
        });
    } catch (error) {
        // テーブルが存在しない場合でもエラーを返す
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            hint: 'comment_reports table may not exist yet'
        });
    }
});

module.exports = router;

// Made with Bob