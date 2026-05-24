# 投票系统 - 独立部署指南

## 快速部署（推荐）

### 第一步：购买服务器和域名

| 项目 | 推荐配置 | 费用（约） |
|------|---------|-----------|
| 云服务器 | 2核2G，Ubuntu 22.04 | ¥100-300/年 |
| 域名 | 任意 | ¥10-50/年 |

**推荐服务商**：阿里云、腾讯云、华为云

### 第二步：域名解析

在域名管理后台添加 A 记录：

```
类型: A
主机记录: @
记录值: 你的服务器IP
```

```
类型: A
主机记录: www
记录值: 你的服务器IP
```

### 第三步：上传项目文件

**方式一：使用 scp（推荐）**

```bash
# 在本地电脑执行，将项目上传到服务器
scp -r /workspace/projects/* root@你的服务器IP:/tmp/vote-system/
```

**方式二：使用 Git**

```bash
# 如果你有 Git 仓库，在服务器上克隆
git clone 你的仓库地址 /var/www/vote-system
```

### 第四步：修改部署脚本配置

```bash
# 登录服务器
ssh root@你的服务器IP

# 编辑部署脚本
nano /tmp/vote-system/deploy/deploy.sh
```

**修改以下变量**：

```bash
DOMAIN="vote.example.com"      # 改成你的域名
DB_PASSWORD="your_password"    # 设置数据库密码
# 或者使用 Supabase：
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="your_key"
```

### 第五步：执行部署脚本

```bash
# 添加执行权限
chmod +x /tmp/vote-system/deploy/deploy.sh

# 执行部署
/tmp/vote-system/deploy/deploy.sh
```

### 第六步：完成

访问 `https://你的域名` 即可使用！

---

## 手动部署（详细步骤）

如果自动脚本出现问题，可以按以下步骤手动部署：

### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
npm install -g pnpm pm2
```

### 2. 安装 PostgreSQL

```bash
apt install -y postgresql postgresql-contrib

sudo -u postgres psql << EOF
CREATE DATABASE vote_system;
CREATE USER vote_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vote_system TO vote_user;
EOF
```

### 3. 部署应用

```bash
mkdir -p /var/www/vote-system
cd /var/www/vote-system

# 上传或克隆项目代码

pnpm install
pnpm build

# 创建环境变量
cat > .env << EOF
PORT=5000
NODE_ENV=production
COZE_PROJECT_DOMAIN_DEFAULT=https://你的域名
DATABASE_URL=postgresql://vote_user:your_password@localhost:5432/vote_system
EOF
```

### 4. 启动服务

```bash
pm2 start pnpm --name "vote-system" -- start
pm2 startup
pm2 save
```

### 5. 配置 Nginx

```bash
apt install -y nginx

cat > /etc/nginx/sites-available/vote-system << 'EOF'
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/vote-system /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 6. 配置 SSL

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名
```

---

## 使用 Supabase 云数据库（推荐）

如果你不想自己维护数据库，可以使用 Supabase 免费套餐：

1. 访问 https://supabase.com 注册账号
2. 创建新项目
3. 获取连接信息：
   - Project URL
   - Anon Key
   - Database Connection String

4. 在部署脚本中设置：

```bash
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJ..."
```

---

## 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs vote-system

# 重启服务
pm2 restart vote-system

# 停止服务
pm2 stop vote-system

# 更新代码
cd /var/www/vote-system
git pull
pnpm install
pnpm build
pm2 restart vote-system
```

---

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 代理 | agent | agent123 |

**⚠️ 部署后请立即修改密码！**

---

## 故障排除

### 1. 端口被占用

```bash
# 查看 5000 端口占用
lsof -i:5000

# 杀死进程
kill -9 <PID>
```

### 2. Nginx 配置错误

```bash
# 测试配置
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log
```

### 3. 数据库连接失败

```bash
# 测试连接
psql -h localhost -U vote_user -d vote_system

# 查看 PostgreSQL 状态
systemctl status postgresql
```

### 4. 查看应用日志

```bash
pm2 logs vote-system --lines 100
```

---

## 安全建议

1. **修改默认密码**：部署后立即修改 admin 和 agent 密码
2. **启用防火墙**：只开放必要端口
3. **定期备份**：定期备份数据库
4. **更新系统**：定期更新系统和依赖

```bash
# 修改密码（进入后台用户管理）
# 或直接修改数据库
```

---

## 费用总结

| 项目 | 最低费用 | 推荐配置 |
|------|---------|---------|
| 云服务器 | ¥100/年 | ¥200/年 |
| 域名 | ¥10/年 | ¥50/年 |
| SSL证书 | 免费 | 免费 |
| 数据库 | 免费（Supabase） | 免费 |
| **总计** | **¥110/年** | **¥250/年** |
