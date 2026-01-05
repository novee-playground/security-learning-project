/**
 * 投稿詳細コンポーネント
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { postAPI, commentAPI } from '../services/api';

function PostDetail() {
    const { postId } = useParams();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPost();
        loadComments();
    }, [postId]);

    const loadPost = async () => {
        try {
            const data = await postAPI.getPost(postId);
            setPost(data);
        } catch (err) {
            console.error('Failed to load post:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async () => {
        try {
            const data = await commentAPI.getComments(postId);
            // データが配列であることを確認
            const commentsArray = data.comments || data;
            setComments(Array.isArray(commentsArray) ? commentsArray : []);
        } catch (err) {
            console.error('Failed to load comments:', err);
            setComments([]); // エラー時は空配列をセット
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        try {
            await commentAPI.createComment(postId, newComment);
            setNewComment('');
            loadComments();
        } catch (err) {
            console.error('Failed to create comment:', err);
        }
    };

    if (loading) return <div className="loading">読み込み中...</div>;
    if (!post) return <div className="error">投稿が見つかりません</div>;

    return (
        <div className="container">
            <div className="card">
                <h1>{post.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
                <p>投稿者: {post.username}</p>
            </div>

            <div className="card">
                <h2>コメント</h2>
                {comments.map(comment => (
                    <div key={comment.id} className="comment">
                        <div dangerouslySetInnerHTML={{ __html: comment.content }} />
                        <p>- {comment.username}</p>
                    </div>
                ))}

                <form onSubmit={handleCommentSubmit}>
                    <div className="form-group">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="コメントを入力..."
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">
                        コメントする
                    </button>
                </form>
            </div>
        </div>
    );
}

export default PostDetail;

// Made with Bob