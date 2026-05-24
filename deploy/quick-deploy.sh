#!/bin/bash

# ========================================
# 投票系统 - 一键部署命令
# ========================================
# 使用方法：复制下面的一行命令，粘贴到服务器终端执行
# ========================================

# 一键部署命令（复制整行）：
# curl -fsSL https://your-domain.com/install.sh | bash

# 或者手动执行：
echo ""
echo "========================================"
echo "  投票系统 - 一键安装"
echo "========================================"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户或 sudo 执行此脚本"
    exit 1
fi

# 安装基础依赖
echo "[1/5] 安装系统依赖..."
apt update && apt install -y curl wget git

# 安装 Node.js
echo "[2/5] 安装 Node.js 24..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs
    npm install -g pnpm pm2
fi
echo "Node.js 版本: $(node -v)"

# 创建项目目录
echo "[3/5] 创建项目目录..."
mkdir -p /var/www/vote-system
cd /var/www/vote-system

# 检查是否有项目文件
if [ ! -f "package.json" ]; then
    echo ""
    echo "========================================"
    echo "请将项目文件上传到此目录："
    echo "  /var/www/vote-system/"
    echo ""
    echo "上传命令示例（在本地电脑执行）："
    echo "  scp -r ./项目目录/* root@服务器IP:/var/www/vote-system/"
    echo "========================================"
    echo ""
    read -p "文件已上传完成？按回车继续..."
fi

# 配置向导
echo "[4/5] 配置向导..."
echo ""
read -p "请输入你的域名（如 vote.example.com）: " DOMAIN
read -p "使用 Supabase 云数据库？(y/n): " USE_SUPABASE

if [ "$USE_SUPABASE" = "y" ]; then
    read -p "请输入 Supabase URL: " SUPABASE_URL
    read -p "请输入 Supabase Anon Key: " SUPABASE_KEY
    
    cat > .env << EOF
PORT=5000
NODE_ENV=production
COZE_PROJECT_DOMAIN_DEFAULT=https://$DOMAIN
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_KEY
DATABASE_URL=$SUPABASE_URL
EOF
else
    read -p "请输入数据库密码: " DB_PASS
    
    # 安装 PostgreSQL
    apt install -y postgresql postgresql-contrib
    sudo -u postgres psql << EOF
CREATE DATABASE vote_system;
CREATE USER vote_user WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE vote_system TO vote_user;
EOF
    
    cat > .env << EOF
PORT=5000
NODE_ENV=production
COZE_PROJECT_DOMAIN_DEFAULT=https://$DOMAIN
DATABASE_URL=postgresql://vote_user:$DB_PASS@localhost:5432/vote_system
EOF
fi

# 安装依赖并构建
echo "[5/5] 安装依赖并构建..."
pnpm install
pnpm build

# 配置 PM2
pm2 start pnpm --name "vote-system" -- start
pm2 startup | tail -n 1 | bash
pm2 save

# 配置 Nginx
apt install -y nginx
cat > /etc/nginx/sites-available/vote-system << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/vote-system /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 配置防火墙
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# 申请 SSL
echo ""
read -p "域名已解析到服务器？(y/n): " DNS_OK
if [ "$DNS_OK" = "y" ]; then
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || echo "SSL申请失败，请稍后手动申请"
fi

# 完成
echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "访问地址: https://$DOMAIN"
echo "后台地址: https://$DOMAIN/admin/login"
echo ""
echo "默认账号:"
echo "  管理员: admin / admin123"
echo "  代理:   agent / agent123"
echo ""
echo "========================================"
