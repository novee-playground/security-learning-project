/**
 * API通信サービス
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 * 本番環境では絶対に使用しないでください！
 */

import axios from 'axios';

// ===== 脆弱性1: APIキーのハードコード =====
const API_KEY = 'exposed_api_key_12345';
// Empty baseURL → relative paths (/api/...) so requests stay same-origin
// and get proxied by setupProxy.js to BACKEND_URL.
const API_URL = window.APP_CONFIG?.API_URL || process.env.REACT_APP_API_URL || '';

// ===== 脆弱性2: 機密情報のローカルストレージ保存 =====
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// ===== 脆弱性3: ユーザー情報の平文保存 =====
const getUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

const setUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    // ===== 脆弱性4: パスワードも保存 =====
    if (user.password) {
        localStorage.setItem('userPassword', user.password);
    }
};

const removeUser = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userPassword');
};

// Axiosインスタンスの作成
const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        // ===== 脆弱性5: APIキーをヘッダーに含める =====
        'X-API-Key': API_KEY
    }
});

// ===== 脆弱性6: リクエストインターセプターでトークンを追加（CSRFトークンなし） =====
api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // ===== 脆弱性7: リクエスト内容をコンソールに出力 =====
        console.log('API Request:', {
            method: config.method,
            url: config.url,
            headers: config.headers,
            data: config.data
        });

        return config;
    },
    (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// ===== 脆弱性8: レスポンスインターセプターで詳細情報を出力 =====
api.interceptors.response.use(
    (response) => {
        console.log('API Response:', {
            status: response.status,
            data: response.data,
            headers: response.headers
        });
        return response;
    },
    (error) => {
        console.error('Response Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        return Promise.reject(error);
    }
);

// 認証API
export const authAPI = {
    // ログイン
    login: async (username, password) => {
        const response = await api.post('/api/auth/login', { username, password });
        if (response.data.token) {
            setToken(response.data.token);
            setUser(response.data.user);
        }
        return response.data;
    },

    // 登録
    register: async (username, email, password) => {
        const response = await api.post('/api/auth/register', { username, email, password });
        if (response.data.token) {
            setToken(response.data.token);
            setUser(response.data.user);
        }
        return response.data;
    },

    // ログアウト
    logout: () => {
        removeToken();
        removeUser();
    }
};

// ユーザーAPI
export const userAPI = {
    // ユーザー一覧取得
    getUsers: async () => {
        const response = await api.get('/api/users');
        return response.data;
    },

    // ユーザー詳細取得
    getUser: async (userId) => {
        const response = await api.get(`/api/users/${userId}`);
        return response.data;
    },

    // プロフィール更新
    updateProfile: async (userId, data) => {
        const response = await api.put(`/api/users/${userId}`, data);
        return response.data;
    }
};

// 投稿API
export const postAPI = {
    // 投稿一覧取得
    getPosts: async () => {
        const response = await api.get('/api/posts');
        return response.data;
    },

    // 投稿詳細取得
    getPost: async (postId) => {
        const response = await api.get(`/api/posts/${postId}`);
        return response.data;
    },

    // 投稿作成
    createPost: async (title, content) => {
        const response = await api.post('/api/posts', { title, content });
        return response.data;
    },

    // 投稿更新
    updatePost: async (postId, title, content) => {
        const response = await api.put(`/api/posts/${postId}`, { title, content });
        return response.data;
    },

    // 投稿削除
    deletePost: async (postId) => {
        const response = await api.delete(`/api/posts/${postId}`);
        return response.data;
    }
};

// コメントAPI
export const commentAPI = {
    // コメント一覧取得
    getComments: async (postId) => {
        const response = await api.get(`/api/comments?postId=${postId}`);
        return response.data;
    },

    // コメント作成
    createComment: async (postId, content) => {
        const response = await api.post('/api/comments', { postId, content });
        return response.data;
    }
};

// 検索API
export const searchAPI = {
    // ===== 脆弱性9: URLパラメータに直接検索クエリを含める =====
    search: async (query) => {
        const response = await api.get(`/api/search?q=${query}`);
        return response.data;
    }
};

// アップロードAPI
export const uploadAPI = {
    // ファイルアップロード
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/api/uploads', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};

// 管理者API
export const adminAPI = {
    // 全ユーザー取得
    getAllUsers: async () => {
        const response = await api.get('/api/admin/users');
        return response.data;
    },

    // ユーザー削除
    deleteUser: async (userId) => {
        const response = await api.delete(`/api/admin/users/${userId}`);
        return response.data;
    }
};

// ===== 脆弱性10: トークンとユーザー情報をエクスポート =====
export { getToken, setToken, removeToken, getUser, setUser, removeUser };

export default api;

// Made with Bob