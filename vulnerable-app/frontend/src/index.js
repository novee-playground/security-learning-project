/**
 * エントリーポイント
 * 
 * 警告: このコードには意図的にセキュリティ脆弱性が含まれています。
 * 本番環境では絶対に使用しないでください！
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// ===== 脆弱性1: Strict Modeを無効化 =====
// React.StrictModeを使用しない（開発時の警告を無効化）
root.render(
    <App />
);

// ===== 脆弱性2: グローバル変数の露出 =====
window.appVersion = '1.0.0';
window.debugMode = true;

// ===== 脆弱性3: コンソールログの露出 =====
console.log('Application started');
console.log('Debug mode:', window.debugMode);
console.log('API URL:', window.APP_CONFIG?.API_URL);

// Made with Bob