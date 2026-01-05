/**
 * ファイルアップロードルート（脆弱性あり - 学習用）
 * 
 * 含まれる脆弱性:
 * 1. 任意のファイルアップロード
 * 2. パストラバーサル
 * 3. ファイルタイプ検証の欠如
 * 4. ファイルサイズ制限なし
 * 5. ファイル名のサニタイゼーション不足
 * 6. ディレクトリリスティング
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// データベース接続
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'vulnapp',
    password: process.env.DB_PASSWORD || 'insecure_password_123',
    database: process.env.DB_NAME || 'vulnerable_app'
});

// アップロードディレクトリの作成
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ===== 脆弱性1: 危険なファイルストレージ設定 =====
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // パストラバーサル脆弱性
        const customPath = req.query.path || '';
        const targetDir = path.join(uploadDir, customPath);

        // ディレクトリが存在しない場合は作成
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        // ファイル名のサニタイゼーションなし
        const customName = req.query.filename || file.originalname;
        cb(null, customName); // 危険：任意のファイル名を許可
    }
});

// ===== 脆弱性2: ファイルフィルタリングなし =====
const upload = multer({
    storage: storage,
    // ファイルタイプのフィルタリングなし
    // ファイルサイズ制限なし
    // limits: { fileSize: ... } を設定していない
});

// ===== 脆弱性3: 単一ファイルアップロード（検証なし） =====
router.post('/single', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { user_id, description } = req.body;

        // ファイル情報をデータベースに保存
        const query = `
            INSERT INTO uploads (user_id, filename, original_name, mimetype, size, path, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await pool.query(query, [
            user_id || null,
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            req.file.path,
            description || null
        ]);

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            file: result.rows[0],
            warning: 'No file type validation! You can upload ANY file type including executables!',
            hints: [
                'Try uploading: shell.php, malware.exe, script.js',
                'Try path traversal: ?path=../../etc',
                'Try custom filename: ?filename=../../etc/passwd'
            ]
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性4: 複数ファイルアップロード（検証なし） =====
router.post('/multiple', upload.array('files', 100), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const { user_id, description } = req.body;
        const uploadedFiles = [];

        for (const file of req.files) {
            const query = `
                INSERT INTO uploads (user_id, filename, original_name, mimetype, size, path, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const result = await pool.query(query, [
                user_id || null,
                file.filename,
                file.originalname,
                file.mimetype,
                file.size,
                file.path,
                description || null
            ]);

            uploadedFiles.push(result.rows[0]);
        }

        res.status(201).json({
            success: true,
            message: `${uploadedFiles.length} files uploaded successfully`,
            files: uploadedFiles,
            warning: 'No rate limiting! You can upload unlimited files!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性5: ファイルダウンロード（パストラバーサル） =====
router.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const customPath = req.query.path || '';

        // パストラバーサル脆弱性
        const filePath = path.join(uploadDir, customPath, filename);

        console.log('Download request:', filePath);

        // ファイルの存在チェックのみ（パス検証なし）
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'File not found',
                requestedPath: filePath,
                hint: 'Try path traversal: ?path=../../etc&filename=passwd'
            });
        }

        // ファイルをダウンロード
        res.download(filePath, filename, (err) => {
            if (err) {
                res.status(500).json({
                    error: err.message,
                    stack: err.stack
                });
            }
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性6: ファイル表示（パストラバーサル + XSS） =====
router.get('/view/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const customPath = req.query.path || '';

        // パストラバーサル脆弱性
        const filePath = path.join(uploadDir, customPath, filename);

        console.log('View request:', filePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send(`
                <html>
                <body>
                    <h1>File not found</h1>
                    <p>Path: ${filePath}</p>
                </body>
                </html>
            `);
        }

        // ファイル内容を読み取り
        const content = fs.readFileSync(filePath, 'utf8');

        // XSS脆弱性: HTMLをそのまま表示
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>File Viewer: ${filename}</title>
                <style>
                    body { font-family: monospace; padding: 20px; }
                    pre { background: #f4f4f4; padding: 15px; }
                </style>
            </head>
            <body>
                <h1>File: ${filename}</h1>
                <p>Path: ${filePath}</p>
                <h2>Content:</h2>
                <pre>${content}</pre>
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

// ===== 脆弱性7: ディレクトリリスティング =====
router.get('/list', (req, res) => {
    try {
        const customPath = req.query.path || '';
        const targetDir = path.join(uploadDir, customPath);

        console.log('List directory:', targetDir);

        // パストラバーサル脆弱性
        if (!fs.existsSync(targetDir)) {
            return res.status(404).json({
                error: 'Directory not found',
                requestedPath: targetDir,
                hint: 'Try: ?path=../../etc'
            });
        }

        // ディレクトリの内容を読み取り
        const files = fs.readdirSync(targetDir, { withFileTypes: true });

        const fileList = files.map(file => {
            const filePath = path.join(targetDir, file.name);
            const stats = fs.statSync(filePath);

            return {
                name: file.name,
                type: file.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                path: filePath // 絶対パスを露出
            };
        });

        res.json({
            success: true,
            path: targetDir,
            count: fileList.length,
            files: fileList,
            warning: 'Directory listing enabled! All files are exposed!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性8: ファイル削除（認可チェックなし） =====
router.delete('/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const customPath = req.query.path || '';

        // 認証チェックなし
        // 所有者確認なし

        // パストラバーサル脆弱性
        const filePath = path.join(uploadDir, customPath, filename);

        console.log('Delete request:', filePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                error: 'File not found',
                requestedPath: filePath
            });
        }

        // ファイルを削除
        fs.unlinkSync(filePath);

        // データベースからも削除
        const query = 'DELETE FROM uploads WHERE filename = $1 RETURNING *';
        const result = await pool.query(query, [filename]);

        res.json({
            success: true,
            message: 'File deleted successfully',
            deletedFile: result.rows[0] || { filename: filename },
            warning: 'No authorization check! Anyone can delete any file!'
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// ===== 脆弱性9: アップロード履歴（SQLインジェクション） =====
router.get('/history/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // SQLインジェクション脆弱性
        const query = `
            SELECT 
                u.*,
                us.username,
                us.email
            FROM uploads u
            LEFT JOIN users us ON u.user_id = us.id
            WHERE u.user_id = ${userId}
            ORDER BY u.created_at DESC
        `;

        console.log('Upload history query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            uploads: result.rows,
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

// ===== 脆弱性10: ファイル検索（SQLインジェクション） =====
router.get('/search', async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        const fileType = req.query.type || '';

        // SQLインジェクション脆弱性
        let query = `SELECT * FROM uploads WHERE 1=1`;

        if (searchTerm) {
            query += ` AND (filename LIKE '%${searchTerm}%' OR original_name LIKE '%${searchTerm}%')`;
        }

        if (fileType) {
            query += ` AND mimetype LIKE '%${fileType}%'`;
        }

        query += ` ORDER BY created_at DESC`;

        console.log('Search query:', query);

        const result = await pool.query(query);

        res.json({
            success: true,
            count: result.rows.length,
            uploads: result.rows,
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

// ===== 脆弱性11: ファイル統計情報 =====
router.get('/stats/summary', async (req, res) => {
    try {
        const queries = {
            totalFiles: 'SELECT COUNT(*) as count FROM uploads',
            totalSize: 'SELECT SUM(size) as total FROM uploads',
            filesByType: 'SELECT mimetype, COUNT(*) as count FROM uploads GROUP BY mimetype',
            recentUploads: 'SELECT * FROM uploads ORDER BY created_at DESC LIMIT 10',
            largestFiles: 'SELECT * FROM uploads ORDER BY size DESC LIMIT 10'
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

// ===== 脆弱性12: ファイルのメタデータ更新（認可チェックなし） =====
router.put('/:id/metadata', async (req, res) => {
    try {
        const uploadId = req.params.id;
        const { description, filename } = req.body;

        // 認証チェックなし
        // 所有者確認なし

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }

        if (filename) {
            updates.push(`filename = $${paramCount++}`);
            values.push(filename);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = NOW()`);
        values.push(uploadId);

        const query = `
            UPDATE uploads 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        res.json({
            success: true,
            message: 'Metadata updated successfully',
            upload: result.rows[0]
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