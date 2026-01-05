/**
 * 管理者コンポーネント
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 */

import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

function Admin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            // ===== 脆弱性: クライアント側での権限チェックのみ =====
            const data = await adminAPI.getAllUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        // ===== 脆弱性: 削除確認なし =====
        try {
            await adminAPI.deleteUser(userId);
            setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
            console.error('Failed to delete user:', err);
            alert('ユーザーの削除に失敗しました');
        }
    };

    if (loading) return <div className="loading">読み込み中...</div>;

    return (
        <div className="container">
            <div className="card">
                <h1>管理者パネル</h1>
                <p>全ユーザー一覧</p>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ddd' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>ID</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>ユーザー名</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>メール</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>役割</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '10px' }}>{user.id}</td>
                                <td style={{ padding: '10px' }}>{user.username}</td>
                                <td style={{ padding: '10px' }}>{user.email}</td>
                                <td style={{ padding: '10px' }}>{user.role || 'user'}</td>
                                <td style={{ padding: '10px' }}>
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="btn btn-danger"
                                        style={{ padding: '5px 10px', fontSize: '14px' }}
                                    >
                                        削除
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Admin;

// Made with Bob