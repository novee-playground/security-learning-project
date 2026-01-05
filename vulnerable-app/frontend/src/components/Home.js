/**
 * ホームコンポーネント（投稿一覧）
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { postAPI } from '../services/api';
import './Home.css';

function Home({ user }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const data = await postAPI.getPosts();
            // APIレスポンスがオブジェクトの場合、postsプロパティを取得
            const postsArray = data.posts || data;
            setPosts(Array.isArray(postsArray) ? postsArray : []);
        } catch (err) {
            console.error('Failed to load posts:', err);
            setError('投稿の読み込みに失敗しました');
            setPosts([]); // エラー時は空配列をセット
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (postId) => {
        // ===== 脆弱性1: 削除確認なし =====
        try {
            await postAPI.deletePost(postId);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (err) {
            console.error('Failed to delete post:', err);
            alert('投稿の削除に失敗しました');
        }
    };

    if (loading) {
        return <div className="loading">読み込み中...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="container">
            <div className="home-header">
                <h1>投稿一覧</h1>
                <Link to="/create-post" className="btn btn-primary">
                    新規投稿
                </Link>
            </div>

            <div className="posts-list">
                {posts.length === 0 ? (
                    <div className="no-posts">投稿がありません</div>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="post-card card">
                            <div className="post-header">
                                <Link to={`/profile/${post.user_id}`} className="post-author">
                                    {post.username}
                                </Link>
                                <span className="post-date">
                                    {new Date(post.created_at).toLocaleDateString('ja-JP')}
                                </span>
                            </div>

                            <Link to={`/post/${post.id}`}>
                                <h2 className="post-title">{post.title}</h2>
                            </Link>

                            {/* ===== 脆弱性2: XSS - dangerouslySetInnerHTML使用 ===== */}
                            <div
                                className="post-content"
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />

                            <div className="post-footer">
                                <Link to={`/post/${post.id}`} className="btn btn-secondary">
                                    詳細を見る
                                </Link>

                                {/* ===== 脆弱性3: 権限チェックなし ===== */}
                                {user.id === post.user_id && (
                                    <button
                                        onClick={() => handleDelete(post.id)}
                                        className="btn btn-danger"
                                    >
                                        削除
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Home;

// Made with Bob