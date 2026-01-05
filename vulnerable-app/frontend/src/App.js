/**
 * メインアプリケーションコンポーネント
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 * 本番環境では絶対に使用しないでください！
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// コンポーネントのインポート
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import Profile from './components/Profile';
import PostDetail from './components/PostDetail';
import CreatePost from './components/CreatePost';
import Search from './components/Search';
import Admin from './components/Admin';
import Header from './components/Header';

import { getToken, getUser } from './services/api';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // ===== 脆弱性1: トークンの検証なし =====
        const token = getToken();
        const user = getUser();

        if (token && user) {
            setIsAuthenticated(true);
            setCurrentUser(user);

            // ===== 脆弱性2: ユーザー情報をコンソールに出力 =====
            console.log('Current User:', user);
            console.log('Token:', token);
        }
    }, []);

    // ===== 脆弱性3: グローバルスコープにユーザー情報を露出 =====
    window.currentUser = currentUser;
    window.isAuthenticated = isAuthenticated;

    return (
        <Router>
            <div className="App">
                {isAuthenticated && <Header user={currentUser} setIsAuthenticated={setIsAuthenticated} />}

                <Routes>
                    {/* 公開ルート */}
                    <Route
                        path="/login"
                        element={
                            isAuthenticated ?
                                <Navigate to="/" /> :
                                <Login setIsAuthenticated={setIsAuthenticated} setCurrentUser={setCurrentUser} />
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            isAuthenticated ?
                                <Navigate to="/" /> :
                                <Register setIsAuthenticated={setIsAuthenticated} setCurrentUser={setCurrentUser} />
                        }
                    />

                    {/* 認証が必要なルート（ただし脆弱） */}
                    <Route
                        path="/"
                        element={
                            isAuthenticated ?
                                <Home user={currentUser} /> :
                                <Navigate to="/login" />
                        }
                    />
                    <Route
                        path="/profile/:userId"
                        element={
                            isAuthenticated ?
                                <Profile user={currentUser} /> :
                                <Navigate to="/login" />
                        }
                    />
                    <Route
                        path="/post/:postId"
                        element={
                            isAuthenticated ?
                                <PostDetail user={currentUser} /> :
                                <Navigate to="/login" />
                        }
                    />
                    <Route
                        path="/create-post"
                        element={
                            isAuthenticated ?
                                <CreatePost user={currentUser} /> :
                                <Navigate to="/login" />
                        }
                    />
                    <Route
                        path="/search"
                        element={
                            isAuthenticated ?
                                <Search /> :
                                <Navigate to="/login" />
                        }
                    />

                    {/* ===== 脆弱性4: 管理者権限のチェックなし ===== */}
                    <Route
                        path="/admin"
                        element={
                            isAuthenticated ?
                                <Admin user={currentUser} /> :
                                <Navigate to="/login" />
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;

// Made with Bob