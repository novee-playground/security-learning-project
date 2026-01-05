/**
 * 検索ルート（脆弱性あり - 学習用）
 * 
 * 含まれる脆弱性:
 * 1. SQLインジェクション
 * 2. NoSQLインジェクション
 * 3. XSS (Reflected)
 * 4. 情報漏洩
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

// ===== 脆弱性1: 全体検索（SQLインジェクション + XSS） =====
router.get('/', async (req, res) => {
    try {
        const query = req.query.q || '';
        const type = req.query.type || 'all'; // all, users, posts, comments

        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        let results = {};

        // SQLインジェクション脆弱性
        if (type === 'all' || type === 'users') {
            const userQuery = `
                SELECT id, username, email, role, created_at
                FROM users
                WHERE username LIKE '%${query}%' OR email LIKE '%${query}%'
            `;
            console.log('User search query:', userQuery);
            const userResult = await pool.query(userQuery);
            results.users = userResult.rows;
        }

        if (type === 'all' || type === 'posts') {
            const postQuery = `
                SELECT p.*, u.username
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.title LIKE '%${query}%' OR p.content LIKE '%${query}%'
            `;
            console.log('Post search query:', postQuery);
            const postResult = await pool.query(postQuery);
            results.posts = postResult.rows;
        }

        if (type === 'all' || type === 'comments') {
            const commentQuery = `
                SELECT c.*, u.username, p.title as post_title
                FROM comments c
                JOIN users u ON c.user_id = u.id
                JOIN posts p ON c.post_id = p.id
                WHERE c.content LIKE '%${query}%'
            `;
            console.log('Comment search query:', commentQuery);
            const commentResult = await pool.query(commentQuery);
            results.comments = commentResult.rows;
        }

        res.json({
            success: true,
            query: query,
            type: type,
            results: results,
            warning: 'SQL injection vulnerability! Try: \' OR \'1\'=\'1'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性2: 高度な検索（複雑なSQLインジェクション） =====
router.post('/advanced', async (req, res) => {
    try {
        const {
            keywords,
            username,
            email,
            dateFrom,
            dateTo,
            orderBy,
            limit,
            offset
        } = req.body;

        // SQLインジェクション脆弱性
        let query = 'SELECT * FROM users WHERE 1=1';

        if (keywords) {
            query += ` AND (username LIKE '%${keywords}%' OR email LIKE '%${keywords}%')`;
        }

        if (username) {
            query += ` AND username = '${username}'`;
        }

        if (email) {
            query += ` AND email = '${email}'`;
        }

        if (dateFrom) {
            query += ` AND created_at >= '${dateFrom}'`;
        }

        if (dateTo) {
            query += ` AND created_at <= '${dateTo}'`;
        }

        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        } else {
            query += ' ORDER BY created_at DESC';
        }

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        if (offset) {
            query += ` OFFSET ${offset}`;
        }

        console.log('Advanced search query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            results: result.rows,
            query: query,
            warning: 'Multiple SQL injection points!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性3: 検索結果のHTML表示（Reflected XSS） =====
router.get('/results', async (req, res) => {
    try {
        const query = req.query.q || '';
        const category = req.query.category || 'all';

        if (!query) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Search</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .search-box { margin: 20px 0; }
                        input { padding: 10px; width: 300px; }
                        button { padding: 10px 20px; }
                    </style>
                </head>
                <body>
                    <h1>Search</h1>
                    <div class="search-box">
                        <form action="/api/search/results" method="GET">
                            <input type="text" name="q" placeholder="Search...">
                            <button type="submit">Search</button>
                        </form>
                    </div>
                </body>
                </html>
            `);
        }

        // SQLインジェクション脆弱性
        const sqlQuery = `
            SELECT * FROM posts 
            WHERE title LIKE '%${query}%' OR content LIKE '%${query}%'
            ORDER BY created_at DESC
        `;

        console.log('Search results query:', sqlQuery);

        const result = await pool.query(sqlQuery);

        // Reflected XSS脆弱性
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Search Results</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .result { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
                    .title { font-size: 18px; font-weight: bold; }
                    .content { margin-top: 10px; }
                    .meta { color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>Search Results for: ${query}</h1>
                <p>Category: ${category}</p>
                <p>Found ${result.rows.length} results</p>
                
                <div class="results">
                    ${result.rows.map(post => `
                        <div class="result">
                            <div class="title">${post.title}</div>
                            <div class="content">${post.content}</div>
                            <div class="meta">Posted on ${post.created_at}</div>
                        </div>
                    `).join('')}
                </div>
                
                <p>Query executed: ${sqlQuery}</p>
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

// ===== 脆弱性4: オートコンプリート（SQLインジェクション） =====
router.get('/autocomplete', async (req, res) => {
    try {
        const term = req.query.term || '';
        const field = req.query.field || 'username'; // username, email, title

        if (!term) {
            return res.json({ suggestions: [] });
        }

        let query;

        // SQLインジェクション脆弱性
        if (field === 'username') {
            query = `SELECT DISTINCT username FROM users WHERE username LIKE '%${term}%' LIMIT 10`;
        } else if (field === 'email') {
            query = `SELECT DISTINCT email FROM users WHERE email LIKE '%${term}%' LIMIT 10`;
        } else if (field === 'title') {
            query = `SELECT DISTINCT title FROM posts WHERE title LIKE '%${term}%' LIMIT 10`;
        } else {
            query = `SELECT DISTINCT ${field} FROM users WHERE ${field} LIKE '%${term}%' LIMIT 10`;
        }

        console.log('Autocomplete query:', query);

        const result = await pool.query(query);

        const suggestions = result.rows.map(row => Object.values(row)[0]);

        res.json({
            success: true,
            term: term,
            field: field,
            suggestions: suggestions,
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

// ===== 脆弱性5: フィルタリング検索（SQLインジェクション） =====
router.get('/filter', async (req, res) => {
    try {
        const {
            role,
            status,
            minLikes,
            maxLikes,
            tags,
            sortBy,
            order
        } = req.query;

        // SQLインジェクション脆弱性
        let query = 'SELECT * FROM posts WHERE 1=1';

        if (role) {
            query += ` AND user_id IN (SELECT id FROM users WHERE role = '${role}')`;
        }

        if (status) {
            query += ` AND is_published = ${status === 'published' ? 'true' : 'false'}`;
        }

        if (minLikes) {
            query += ` AND likes >= ${minLikes}`;
        }

        if (maxLikes) {
            query += ` AND likes <= ${maxLikes}`;
        }

        if (tags) {
            query += ` AND '${tags}' = ANY(tags)`;
        }

        if (sortBy) {
            query += ` ORDER BY ${sortBy}`;
            if (order) {
                query += ` ${order}`;
            }
        }

        console.log('Filter query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            results: result.rows,
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

// ===== 脆弱性6: 全文検索（SQLインジェクション） =====
router.get('/fulltext', async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        const tables = req.query.tables || 'posts,comments'; // カンマ区切り

        if (!searchTerm) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        const tableList = tables.split(',');
        const results = {};

        for (const table of tableList) {
            // SQLインジェクション脆弱性
            const query = `
                SELECT * FROM ${table}
                WHERE to_tsvector('english', content) @@ to_tsquery('english', '${searchTerm}')
            `;

            console.log(`Fulltext search in ${table}:`, query);

            try {
                const result = await pool.query(query);
                results[table] = result.rows;
            } catch (err) {
                results[table] = { error: err.message };
            }
        }

        res.json({
            success: true,
            searchTerm: searchTerm,
            tables: tableList,
            results: results,
            warning: 'SQL injection in table names and search terms!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性7: 検索履歴の保存と取得 =====
router.post('/history', async (req, res) => {
    try {
        const { user_id, search_term, results_count } = req.body;

        // 認証チェックなし
        // レート制限なし

        const query = `
            INSERT INTO search_history (user_id, search_term, results_count)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await pool.query(query, [
            user_id || null,
            search_term,
            results_count || 0
        ]);

        res.status(201).json({
            success: true,
            history: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            hint: 'search_history table may not exist yet'
        });
    }
});

router.get('/history/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // 認証チェックなし
        // 誰でも他人の検索履歴を見られる

        // SQLインジェクション脆弱性
        const query = `
            SELECT * FROM search_history
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
            LIMIT 50
        `;

        console.log('Search history query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            history: result.rows,
            query: query,
            warning: 'No authorization check! Anyone can see search history!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

// ===== 脆弱性8: 検索統計情報 =====
router.get('/stats', async (req, res) => {
    try {
        const queries = {
            topSearches: `
                SELECT search_term, COUNT(*) as count
                FROM search_history
                GROUP BY search_term
                ORDER BY count DESC
                LIMIT 10
            `,
            recentSearches: `
                SELECT * FROM search_history
                ORDER BY created_at DESC
                LIMIT 20
            `,
            searchesByUser: `
                SELECT 
                    u.username,
                    u.email,
                    COUNT(sh.id) as search_count
                FROM users u
                LEFT JOIN search_history sh ON u.id = sh.user_id
                GROUP BY u.id, u.username, u.email
                ORDER BY search_count DESC
                LIMIT 10
            `
        };

        const results = {};

        for (const [key, query] of Object.entries(queries)) {
            try {
                const result = await pool.query(query);
                results[key] = result.rows;
            } catch (err) {
                results[key] = { error: err.message };
            }
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

// ===== 脆弱性9: カスタムクエリビルダー（超危険！） =====
router.post('/custom', async (req, res) => {
    try {
        const { table, columns, conditions, orderBy, limit } = req.body;

        // 認証チェックなし
        // SQLインジェクション脆弱性

        const cols = columns || '*';
        let query = `SELECT ${cols} FROM ${table}`;

        if (conditions) {
            query += ` WHERE ${conditions}`;
        }

        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }

        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        console.log('Custom query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            query: query,
            rowCount: result.rowCount,
            results: result.rows,
            warning: 'Complete SQL injection! You can execute any SELECT query!'
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