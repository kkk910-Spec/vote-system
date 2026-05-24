#!/bin/bash

# ========================================
# 投票系统 - 自动化部署脚本
# ========================================
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh
# ========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ========================================
# 配置区域 - 请修改以下变量
# ========================================
DOMAIN=""                    # 你的域名，如: vote.example.com
DB_HOST="localhost"          # 数据库地址
DB_PORT="5432"               # 数据库端口
DB_NAME="vote_system"        # 数据库名称
DB_USER="vote_user"          # 数据库用户名
DB_PASSWORD=""               # 数据库密码（请设置）
SUPABASE_URL=""              # Supabase URL（如果使用Supabase）
SUPABASE_ANON_KEY=""         # Supabase 密钥（如果使用Supabase）

# ========================================
# 检查配置
# ========================================
check_config() {
    echo_info "检查配置..."
    
    if [ -z "$DOMAIN" ]; then
        echo_error "请先在脚本中设置 DOMAIN 变量"
        exit 1
    fi
    
    if [ -z "$DB_PASSWORD" ] && [ -z "$SUPABASE_URL" ]; then
        echo_error "请设置 DB_PASSWORD 或 SUPABASE_URL"
        exit 1
    fi
    
    echo_info "配置检查通过"
}

# ========================================
# 安装系统依赖
# ========================================
install_system_deps() {
    echo_info "更新系统..."
    apt update && apt upgrade -y
    
    echo_info "安装系统依赖..."
    apt install -y curl wget git nginx certbot python3-certbot-nginx ufw
    
    echo_info "系统依赖安装完成"
}

# ========================================
# 安装 Node.js
# ========================================
install_nodejs() {
    echo_info "检查 Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo_info "Node.js 已安装: $NODE_VERSION"
        return
    fi
    
    echo_info "安装 Node.js 24..."
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs
    
    echo_info "安装 pnpm..."
    npm install -g pnpm
    
    echo_info "安装 PM2..."
    npm install -g pm2
    
    echo_info "Node.js 安装完成: $(node -v)"
}

# ========================================
# 安装 PostgreSQL（可选）
# ========================================
install_postgresql() {
    if [ -n "$SUPABASE_URL" ]; then
        echo_info "使用 Supabase 云端数据库，跳过 PostgreSQL 安装"
        return
    fi
    
    echo_info "安装 PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    
    echo_info "配置数据库..."
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
EOF
    
    # 修改 pg_hba.conf 允许密码认证
    sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" /etc/postgresql/*/main/pg_hba.conf
    
    systemctl restart postgresql
    
    echo_info "PostgreSQL 安装完成"
}

# ========================================
# 部署应用
# ========================================
deploy_app() {
    echo_info "创建应用目录..."
    mkdir -p /var/www/vote-system
    cd /var/www/vote-system
    
    # 如果当前目录有项目文件，直接使用
    if [ -f "package.json" ]; then
        echo_info "项目文件已存在"
    else
        echo_warn "请将项目文件上传到 /var/www/vote-system 目录"
        echo_warn "可以使用: scp -r ./vote-system/* root@服务器IP:/var/www/vote-system/"
        read -p "项目文件已上传完成？(y/n): " confirm
        if [ "$confirm" != "y" ]; then
            echo_error "请先上传项目文件"
            exit 1
        fi
    fi
    
    echo_info "安装依赖..."
    pnpm install
    
    echo_info "构建项目..."
    pnpm build
    
    echo_info "创建环境变量文件..."
    if [ -n "$SUPABASE_URL" ]; then
        cat > .env << EOF
PORT=5000
NODE_ENV=production
COZE_PROJECT_DOMAIN_DEFAULT=https://$DOMAIN

# Supabase 配置
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
DATABASE_URL=$SUPABASE_URL
EOF
    else
        cat > .env << EOF
PORT=5000
NODE_ENV=production
COZE_PROJECT_DOMAIN_DEFAULT=https://$DOMAIN

# PostgreSQL 配置
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
EOF
    fi
    
    echo_info "应用部署完成"
}

# ========================================
# 配置 PM2
# ========================================
setup_pm2() {
    echo_info "配置 PM2..."
    
    cd /var/www/vote-system
    
    # 创建 PM2 配置文件
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'vote-system',
    script: 'pnpm',
    args: 'start',
    cwd: '/var/www/vote-system',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
}
EOF
    
    # 启动应用
    pm2 start ecosystem.config.js
    
    # 设置开机自启
    pm2 startup
    pm2 save
    
    echo_info "PM2 配置完成"
}

# ========================================
# 配置 Nginx
# ========================================
setup_nginx() {
    echo_info "配置 Nginx..."
    
    cat > /etc/nginx/sites-available/vote-system << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://127.0.0.1:5000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF
    
    # 启用配置
    ln -sf /etc/nginx/sites-available/vote-system /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # 测试配置
    nginx -t
    
    # 重启 Nginx
    systemctl restart nginx
    
    echo_info "Nginx 配置完成"
}

# ========================================
# 配置 SSL
# ========================================
setup_ssl() {
    echo_info "配置 SSL 证书..."
    
    # 检查是否已有证书
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo_info "SSL 证书已存在"
        return
    fi
    
    echo_warn "即将申请 Let's Encrypt 免费 SSL 证书"
    echo_warn "请确保域名已解析到此服务器"
    
    read -p "域名已解析完成？(y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo_warn "跳过 SSL 配置，请稍后手动执行: certbot --nginx -d $DOMAIN"
        return
    fi
    
    # 申请证书
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || {
        echo_warn "SSL 证书申请失败，请检查域名解析"
        return
    }
    
    # 设置自动续期
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo_info "SSL 配置完成"
}

# ========================================
# 配置防火墙
# ========================================
setup_firewall() {
    echo_info "配置防火墙..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    
    ufw --force enable
    
    echo_info "防火墙配置完成"
}

# ========================================
# 初始化数据库
# ========================================
init_database() {
    echo_info "初始化数据库..."
    
    cd /var/www/vote-system
    
    # 运行数据库迁移（如果有）
    if [ -f "scripts/init-db.sql" ]; then
        echo_info "执行数据库初始化脚本..."
        if [ -n "$SUPABASE_URL" ]; then
            echo_warn "使用 Supabase，请在 Supabase 控制台执行 scripts/init-db.sql"
        else
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/init-db.sql
        fi
    fi
    
    echo_info "数据库初始化完成"
}

# ========================================
# 显示结果
# ========================================
show_result() {
    echo ""
    echo "========================================"
    echo -e "${GREEN}部署完成！${NC}"
    echo "========================================"
    echo ""
    echo "访问地址: https://$DOMAIN"
    echo "后台地址: https://$DOMAIN/admin/login"
    echo ""
    echo "默认账号:"
    echo "  管理员: admin / admin123"
    echo "  代理:   agent / agent123"
    echo ""
    echo "常用命令:"
    echo "  查看状态: pm2 status"
    echo "  查看日志: pm2 logs vote-system"
    echo "  重启服务: pm2 restart vote-system"
    echo ""
    echo "========================================"
}

# ========================================
# 主函数
# ========================================
main() {
    echo ""
    echo "========================================"
    echo "  投票系统 - 自动化部署脚本"
    echo "========================================"
    echo ""
    
    check_config
    install_system_deps
    install_nodejs
    install_postgresql
    deploy_app
    setup_pm2
    setup_nginx
    setup_ssl
    setup_firewall
    init_database
    show_result
}

# 执行部署
main
