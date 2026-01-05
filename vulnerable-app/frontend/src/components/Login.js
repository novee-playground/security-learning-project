/**
 * ログインコンポーネント
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';

function Login({ setIsAuthenticated, setCurrentUser }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // ===== 脆弱性1: クライアント側での入力検証のみ =====
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // ===== 脆弱性2: パスワードをコンソールに出力 =====
        console.log('Login attempt:', { username, password });

        try {
            const response = await authAPI.login(username, password);

            // ===== 脆弱性3: レスポンス全体をコンソールに出力 =====
            console.log('Login response:', response);

            setIsAuthenticated(true);
            setCurrentUser(response.user);

            // ===== 脆弱性4: ユーザー情報をグローバルスコープに保存 =====
            window.loggedInUser = response.user;

            navigate('/');
        } catch (err) {
            // ===== 脆弱性5: 詳細なエラーメッセージを表示 =====
            console.error('Login error:', err);
            setError(err.response?.data?.error || 'ログインに失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Vulnerable Social App</h1>
                <p className="subtitle">ログイン</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="ユーザー名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            // ===== 脆弱性6: autocomplete有効 =====
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            // ===== 脆弱性7: autocomplete有効 =====
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className="error">{error}</div>}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'ログイン中...' : 'ログイン'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>アカウントをお持ちでないですか？ <Link to="/register">新規登録</Link></p>
                </div>

                {/* ===== 脆弱性8: テスト用認証情報を表示 ===== */}
                <div className="test-credentials">
                    <p><strong>テスト用アカウント:</strong></p>
                    <p>Email: admin@example.com</p>
                    <p>Password: admin123</p>
                </div>
            </div>
        </div>
    );
}

export default Login;

// Made with Bob