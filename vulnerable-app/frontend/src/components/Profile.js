/**
 * プロフィールコンポーネント
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI } from '../services/api';

function Profile({ user }) {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, [userId]);

    const loadProfile = async () => {
        try {
            const data = await userAPI.getUser(userId);
            setProfile(data);
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">読み込み中...</div>;
    if (!profile) return <div className="error">ユーザーが見つかりません</div>;

    return (
        <div className="container">
            <div className="card">
                <h1>{profile.username}のプロフィール</h1>
                <p>メール: {profile.email}</p>
                <p>登録日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}</p>
                {profile.role && <p>役割: {profile.role}</p>}
            </div>
        </div>
    );
}

export default Profile;

// Made with Bob