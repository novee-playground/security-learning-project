/**
 * 登録コンポーネント
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';

function Register({ setIsAuthenticated, setCurrentUser }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // ===== 脆弱性1: 弱いパスワードポリシー =====
        if (password.length < 3) {
            setError('パスワードは3文字以上である必要があります');
            return;
        }

        if (password !== confirmPassword) {
            setError('パスワードが一致しません');
            return;
        }

        setLoading(true);

        // ===== 脆弱性2: 登録情報をコンソールに出力 =====
        console.log('Register attempt:', { username, email, password });

        try {
            const response = await authAPI.register(username, email, password);
            console.log('Register response:', response);

            setIsAuthenticated(true);
            setCurrentUser(response.user);
            navigate('/');
        } catch (err) {
            console.error('Register error:', err);
            setError(err.response?.data?.error || '登録に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Vulnerable Social App</h1>
                <p className="subtitle">新規登録</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="ユーザー名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="email"
                            placeholder="メールアドレス"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="パスワード（確認）"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="error">{error}</div>}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? '登録中...' : '登録'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>すでにアカウントをお持ちですか？ <Link to="/login">ログイン</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Register;

// Made with Bob