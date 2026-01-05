-- データベース初期化スクリプト
-- 意図的に脆弱性を含むスキーマ設計（学習用）

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- 平文パスワードも保存可能（脆弱性）
    role VARCHAR(20) DEFAULT 'user', -- admin, user, guest
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    -- 意図的に機密情報を保存
    ssn VARCHAR(20), -- 社会保障番号（暗号化なし）
    credit_card VARCHAR(20), -- クレジットカード番号（暗号化なし）
    api_key VARCHAR(100) -- APIキー（平文）
);

-- セッションテーブル
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_valid BOOLEAN DEFAULT true
);

-- 投稿テーブル（XSS脆弱性のため）
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL, -- HTMLタグがそのまま保存される
    is_published BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    tags TEXT[], -- タグ配列
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- コメントテーブル（XSS脆弱性のため）
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE, -- ネストされたコメント用
    content TEXT NOT NULL, -- HTMLタグがそのまま保存される
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ファイルアップロードテーブル
CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    path VARCHAR(500) NOT NULL,
    size INTEGER,
    mimetype VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ログテーブル（機密情報が記録される可能性）
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT, -- SQLクエリやパスワードが記録される可能性
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 設定テーブル
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 検索履歴テーブル
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    search_term TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- コメントレポートテーブル
CREATE TABLE IF NOT EXISTS comment_reports (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- テストデータの挿入

-- 管理者ユーザー（弱いパスワード）
INSERT INTO users (username, email, password, role, ssn, credit_card, api_key) VALUES
('admin', 'admin@example.com', 'admin123', 'admin', '123-45-6789', '4111111111111111', 'sk_test_admin_key_12345'),
('user1', 'user1@example.com', 'password123', 'user', '987-65-4321', '5500000000000004', 'sk_test_user1_key_67890'),
('guest', 'guest@example.com', 'guest', 'guest', NULL, NULL, NULL);

-- サンプル投稿（XSS脆弱性を含む）
INSERT INTO posts (user_id, title, content, is_published, likes, tags) VALUES
(1, 'Welcome Post', '<h1>Welcome to our blog!</h1><p>This is a test post.</p>', true, 10, ARRAY['welcome', 'introduction']),
(1, 'XSS Test Post', '<script>alert("XSS")</script><p>This post contains XSS.</p>', true, 5, ARRAY['security', 'xss']),
(2, 'User Post', '<p>This is a user post with <img src=x onerror=alert("XSS")> image.</p>', true, 3, ARRAY['user', 'test']);

-- サンプルコメント（XSS脆弱性を含む）
INSERT INTO comments (post_id, user_id, content) VALUES
(1, 2, '<p>Great post!</p>'),
(1, 3, '<script>alert("Comment XSS")</script>Nice!'),
(2, 1, '<p>Thanks for sharing!</p>');

-- システム設定（機密情報を含む）
INSERT INTO settings (key, value, is_sensitive) VALUES
('database_url', 'postgresql://vulnapp:insecure_password_123@postgres:5432/vulnerable_app', true),
('jwt_secret', 'weak_secret_key', true),
('api_key', 'exposed_api_key_12345', true),
('smtp_password', 'email_password_123', true),
('encryption_key', 'weak_encryption_key', true),
('debug_mode', 'true', false),
('allow_registration', 'true', false);

-- インデックスの作成（パフォーマンス向上のため）
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_uploads_user_id ON uploads(user_id);

-- ビューの作成（情報漏洩の可能性）
CREATE OR REPLACE VIEW user_details AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    u.ssn, -- 機密情報が含まれる
    u.credit_card, -- 機密情報が含まれる
    u.api_key, -- 機密情報が含まれる
    u.created_at,
    u.last_login,
    COUNT(DISTINCT p.id) as post_count,
    COUNT(DISTINCT c.id) as comment_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON u.id = c.user_id
GROUP BY u.id;

-- ストアドプロシージャ（SQLインジェクション脆弱性を含む可能性）
CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS TABLE (
    id INTEGER,
    username VARCHAR(50),
    email VARCHAR(100),
    role VARCHAR(20)
) AS $$
BEGIN
    -- 意図的に動的SQLを使用（SQLインジェクション脆弱性）
    RETURN QUERY EXECUTE 
        'SELECT id, username, email, role FROM users WHERE username LIKE ''%' || search_term || '%'' OR email LIKE ''%' || search_term || '%''';
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（ログ記録）
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO logs (user_id, action, details)
        VALUES (NEW.id, 'USER_UPDATE', 'User updated: ' || NEW.username);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO logs (user_id, action, details)
        VALUES (OLD.id, 'USER_DELETE', 'User deleted: ' || OLD.username);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_changes_trigger
AFTER UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION log_user_changes();

-- 権限設定（意図的に緩い権限）
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vulnapp;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vulnapp;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO vulnapp;

-- 初期化完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Database initialization completed!';
    RAISE NOTICE 'WARNING: This database contains intentional vulnerabilities for learning purposes.';
    RAISE NOTICE 'DO NOT use this schema in production!';
    RAISE NOTICE '===========================================';
END $$;

-- Made with Bob
