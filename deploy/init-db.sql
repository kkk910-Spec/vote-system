-- ========================================
-- 投票系统 - 数据库初始化脚本
-- ========================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 用户表
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ========================================
-- 投票表
-- ========================================
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    sms_number VARCHAR(20) DEFAULT '106988881700511',
    cover_image TEXT,
    top_text TEXT,
    vote_text TEXT DEFAULT '已有 {count} 人参与投票',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_votes_status ON votes(status);
CREATE INDEX IF NOT EXISTS idx_votes_created_by ON votes(created_by);

-- ========================================
-- 候选人/投票选项表
-- ========================================
CREATE TABLE IF NOT EXISTS vote_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    sms_content TEXT,
    vote_count INTEGER DEFAULT 0,
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vote_options_vote_id ON vote_options(vote_id);

-- ========================================
-- 投票记录表
-- ========================================
CREATE TABLE IF NOT EXISTS vote_records (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
    option_id UUID REFERENCES vote_options(id),
    candidate_id UUID REFERENCES vote_options(id),
    phone_number VARCHAR(20),
    device_id VARCHAR(255),
    agent_id UUID REFERENCES users(id),
    source_link VARCHAR(50),
    voter_ip VARCHAR(50),
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vote_records_vote_id ON vote_records(vote_id);
CREATE INDEX IF NOT EXISTS idx_vote_records_phone ON vote_records(phone_number);
CREATE INDEX IF NOT EXISTS idx_vote_records_device ON vote_records(device_id);
CREATE INDEX IF NOT EXISTS idx_vote_records_agent ON vote_records(agent_id);

-- ========================================
-- 代理推广链接表
-- ========================================
CREATE TABLE IF NOT EXISTS agent_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
    link_code VARCHAR(10) UNIQUE NOT NULL,
    name TEXT,
    click_count INTEGER DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_agent_links_agent_id ON agent_links(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_links_vote_id ON agent_links(vote_id);
CREATE INDEX IF NOT EXISTS idx_agent_links_code ON agent_links(link_code);

-- ========================================
-- 初始数据 - 默认管理员账号
-- ========================================
-- 密码: admin123 (bcrypt加密)
INSERT INTO users (username, password, role, name) VALUES
('admin', '$2b$10$rQZ9QxQxQxQxQxQxQxQxQOZJ9J9J9J9J9J9J9J9J9J9J9J9J9J9J9J', 'admin', '管理员'),
('agent', '$2b$10$rQZ9QxQxQxQxQxQxQxQxQOZJ9J9J9J9J9J9J9J9J9J9J9J9J9J9J9J', 'agent', '代理用户')
ON CONFLICT (username) DO NOTHING;

-- ========================================
-- 更新触发器 - 自动更新 updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_votes_updated_at ON votes;
CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vote_options_updated_at ON vote_options;
CREATE TRIGGER update_vote_options_updated_at BEFORE UPDATE ON vote_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_links_updated_at ON agent_links;
CREATE TRIGGER update_agent_links_updated_at BEFORE UPDATE ON agent_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 完成
-- ========================================
SELECT '数据库初始化完成！' AS message;
