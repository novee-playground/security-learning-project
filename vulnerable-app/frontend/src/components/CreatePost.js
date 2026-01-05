/**
 * 投稿作成コンポーネント
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAPI } from '../services/api';

function CreatePost() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await postAPI.createPost(title, content);
            navigate('/');
        } catch (err) {
            console.error('Failed to create post:', err);
            setError('投稿の作成に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="card">
                <h1>新規投稿</h1>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>タイトル</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>内容</label>
                        <textarea
                            rows="10"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="error">{error}</div>}

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? '投稿中...' : '投稿する'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreatePost;

// Made with Bob