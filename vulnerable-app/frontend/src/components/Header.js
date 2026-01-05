/**
 * ヘッダーコンポーネント
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Header.css';

function Header({ user, setIsAuthenticated }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        authAPI.logout();
        setIsAuthenticated(false);
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="header-container">
                <Link to="/" className="logo">
                    <h2>Vulnerable Social App</h2>
                </Link>

                <nav className="nav">
                    <Link to="/" className="nav-link">ホーム</Link>
                    <Link to="/search" className="nav-link">検索</Link>
                    <Link to="/create-post" className="nav-link">投稿作成</Link>
                    {user?.role === 'admin' && (
                        <Link to="/admin" className="nav-link">管理者</Link>
                    )}
                </nav>

                <div className="user-menu">
                    <Link to={`/profile/${user?.id}`} className="user-link">
                        {user?.username}
                    </Link>
                    <button onClick={handleLogout} className="btn btn-secondary">
                        ログアウト
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;

// Made with Bob