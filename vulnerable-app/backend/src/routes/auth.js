/**
 * 認証ルート（脆弱性を含む）
 * 
 * 学習できる脆弱性:
 * - 弱いパスワードポリシー
 * - SQLインジェクション
 * - 不適切なセッション管理
 * - JWT の脆弱な実装
 * - 認証情報の平文保存
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { executeRawQuery, executeQuery } = require('../config/database');

const router = express.Router();

// ===== 脆弱性: 弱いJWT秘密鍵 =====
const JWT_SECRET = process.env.JWT_SECRET || 'weak_secret_key';

/**
 * ユーザー登録エンドポイント
 * 
 * 脆弱性:
 * - 弱いパスワードポリシー（長さ、複雑さのチェックなし）
 * - ユーザー入力の検証不足
 * - レート制限なし（ブルートフォース攻撃に脆弱）
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // ===== 脆弱性: 入力検証の欠如 =====
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // ===== 脆弱性: 弱いパスワードポリシー =====
        // パスワードの長さや複雑さをチェックしない
        // 最低限のチェックすらない

        // ===== 脆弱性: SQLインジェクション =====
        // ユーザー入力を直接SQLクエリに埋め込む
        const checkQuery = `SELECT * FROM users WHERE username = '${username}' OR email = '${email}'`;
        const existingUser = await executeRawQuery(checkQuery);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // パスワードのハッシュ化（一応実装）
        const hashedPassword = await bcrypt.hash(password, 10);

        // ===== 脆弱性: SQLインジェクション + 権限昇格 =====
        // roleパラメータを検証せずに受け入れる（ユーザーが自分でadminになれる）
        const userRole = role || 'user';

        const insertQuery = `
            INSERT INTO users (username, email, password, role) 
            VALUES ('${username}', '${email}', '${hashedPassword}', '${userRole}')
            RETURNING id, username, email, role, created_at
        `;
        const result = await executeRawQuery(insertQuery);

        // ===== 脆弱性: 機密情報の露出 =====
        res.status(201).json({
            message: 'User registered successfully',
            user: result.rows[0],
            // デバッグ情報を露出
            debug: {
                query: insertQuery,
                hashedPassword: hashedPassword
            }
        });
    } catch (error) {
        // ===== 脆弱性: 詳細なエラー情報の露出 =====
        res.status(500).json({
            error: 'Registration failed',
            details: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

/**
 * ログインエンドポイント
 * 
 * 脆弱性:
 * - SQLインジェクション
 * - タイミング攻撃に脆弱
 * - レート制限なし
 * - 詳細なエラーメッセージ
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // ===== 脆弱性: SQLインジェクション =====
        // 例: username = "admin' OR '1'='1" でログイン可能
        const query = `SELECT * FROM users WHERE username = '${username}'`;
        console.log('Login query:', query); // クエリをログに出力

        const result = await executeRawQuery(query);

        if (result.rows.length === 0) {
            // ===== 脆弱性: 詳細なエラーメッセージ（ユーザー列挙攻撃に脆弱）=====
            return res.status(401).json({
                error: 'User not found',
                hint: 'The username does not exist in our system'
            });
        }

        const user = result.rows[0];

        // ===== 脆弱性: 平文パスワードの比較も許可 =====
        let isValidPassword = false;

        // ハッシュ化されたパスワードとの比較
        if (user.password.startsWith('$2')) {
            isValidPassword = await bcrypt.compare(password, user.password);
        } else {
            // 平文パスワードとの直接比較（脆弱性）
            isValidPassword = password === user.password;
        }

        if (!isValidPassword) {
            // ===== 脆弱性: 詳細なエラーメッセージ =====
            return res.status(401).json({
                error: 'Invalid password',
                hint: 'The password is incorrect',
                attempts_remaining: 'unlimited' // レート制限なし
            });
        }

        // ===== 脆弱性: 弱いJWT実装 =====
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                // 機密情報をトークンに含める
                email: user.email,
                ssn: user.ssn,
                api_key: user.api_key
            },
            JWT_SECRET,
            {
                expiresIn: '24h',
                algorithm: 'HS256' // 弱いアルゴリズム
            }
        );

        // ===== 脆弱性: セッションの不適切な管理 =====
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        // 最終ログイン時刻の更新
        await executeRawQuery(`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`);

        // ===== 脆弱性: 機密情報の露出 =====
        res.json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                // 機密情報を含める
                ssn: user.ssn,
                credit_card: user.credit_card,
                api_key: user.api_key
            },
            session: req.session,
            // デバッグ情報
            debug: {
                jwt_secret: JWT_SECRET,
                token_decoded: jwt.decode(token)
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Login failed',
            details: error.message,
            stack: error.stack,
            sql: error.sql
        });
    }
});

/**
 * ログアウトエンドポイント
 * 
 * 脆弱性:
 * - セッションの不完全な破棄
 * - JWTトークンの無効化なし
 */
router.post('/logout', (req, res) => {
    // ===== 脆弱性: セッションを破棄するだけ（JWTは有効なまま）=====
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                error: 'Logout failed',
                details: err.message
            });
        }

        res.json({
            message: 'Logged out successfully',
            warning: 'JWT token is still valid until expiration'
        });
    });
});

/**
 * パスワードリセットエンドポイント
 * 
 * 脆弱性:
 * - 認証なしでパスワード変更可能
 * - ユーザー列挙攻撃に脆弱
 * - SQLインジェクション
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        if (!username || !newPassword) {
            return res.status(400).json({ error: 'Username and new password are required' });
        }

        // ===== 脆弱性: 認証なしでパスワード変更 =====
        // 本来は確認メールやトークンが必要

        // ===== 脆弱性: SQLインジェクション =====
        const checkQuery = `SELECT id FROM users WHERE username = '${username}'`;
        const userResult = await executeRawQuery(checkQuery);

        if (userResult.rows.length === 0) {
            // ===== 脆弱性: ユーザー列挙攻撃に脆弱 =====
            return res.status(404).json({
                error: 'User not found',
                hint: `No user with username '${username}' exists`
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // ===== 脆弱性: SQLインジェクション =====
        const updateQuery = `UPDATE users SET password = '${hashedPassword}' WHERE username = '${username}'`;
        await executeRawQuery(updateQuery);

        res.json({
            message: 'Password reset successfully',
            username: username,
            newPasswordHash: hashedPassword
        });
    } catch (error) {
        res.status(500).json({
            error: 'Password reset failed',
            details: error.message,
            stack: error.stack
        });
    }
});

/**
 * トークン検証エンドポイント
 * 
 * 脆弱性:
 * - 弱いJWT検証
 * - アルゴリズムの混乱攻撃に脆弱
 */
router.get('/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // ===== 脆弱性: アルゴリズムの検証なし =====
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256', 'HS384', 'HS512', 'none'] // 'none'アルゴリズムを許可
        });

        res.json({
            valid: true,
            decoded: decoded,
            // デバッグ情報
            debug: {
                jwt_secret: JWT_SECRET,
                token: token
            }
        });
    } catch (error) {
        res.status(401).json({
            valid: false,
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;

// Made with Bob
