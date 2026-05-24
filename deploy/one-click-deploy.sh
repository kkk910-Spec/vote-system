#!/bin/bash
# 一键部署脚本 - 投票系统
# 使用方法: bash one-click-deploy.sh exmosjksgg.top

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 打印带颜色的信息
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查参数
DOMAIN=${1:-"exmosjksgg.top"}
info "域名: $DOMAIN"
info "服务器IP: $(curl -s ifconfig.me)"

# 1. 更新系统
info "正在更新系统..."
apt update && apt upgrade -y

# 2. 安装依赖
info "正在安装依赖..."
apt install -y curl wget git nginx certbot python3-certbot-nginx

# 3. 安装 Node.js 24
info "正在安装 Node.js 24..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs
fi
node -v
npm -v

# 4. 安装 pnpm
info "正在安装 pnpm..."
npm install -g pnpm -g
pnpm -v

# 5. 安装 PM2
info "正在安装 PM2..."
npm install -g pm2
pm2 -v

# 6. 创建项目目录
info "正在创建项目目录..."
mkdir -p /var/www/vote-system
cd /var/www/vote-system

# 7. 创建项目文件
info "正在创建项目文件..."

# 创建 package.json
cat > package.json << 'PACKAGEEOF'
{
  "name": "vote-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 5000",
    "build": "next build",
    "start": "next start -p 5000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.3.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@supabase/supabase-js": "^2.49.8",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.12",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "tailwind-merge": "^3.3.0",
    "qrcode": "^1.5.4"
  },
  "devDependencies": {
    "@types/node": "^22.15.21",
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.5",
    "@types/qrcode": "^1.5.5",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.27.0",
    "eslint-config-next": "^15.3.3",
    "postcss": "^8.5.3",
    "tailwindcss": "^4.1.7",
    "typescript": "^5.8.3"
  }
}
PACKAGEEOF

# 创建 next.config.ts
cat > next.config.ts << 'NEXTEOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
NEXTEOF

# 创建 tsconfig.json
cat > tsconfig.json << 'TSEOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
TSEOF

# 创建 tailwind.config.ts
cat > tailwind.config.ts << 'TWEOF'
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  },
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
TWEOF

# 创建 postcss.config.mjs
cat > postcss.config.mjs << 'PCEOF'
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
PCEOF

# 创建 .env 文件（使用现有的Supabase数据库）
cat > .env << 'ENVEOF'
# 数据库配置（使用Supabase云数据库）
DATABASE_URL=postgresql://postgres.fzcdjsncjrfjqfmppcbn:Aa112211@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://fzcdjsncjrfjqfmppcbn.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Y2Rqc25janJmanFmbXBwY2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MjA1NzcsImV4cCI6MjA2MzQ5NjU3N30.oIHwEHtF7FvDKnVeJMSEB-8t-VAWiYkPZI6_G9rgX74

# 服务配置
PORT=5000
NODE_ENV=production
COZE_PROJECT_DOMAIN_DEFAULT=https://exmosjksgg.top
ENVEOF

# 创建 .coze 配置
cat > .coze << 'COZEEOF'
[project]
requires = ["nodejs-24"]

[dev]
build = ["pnpm", "install"]
run = ["pnpm", "run", "dev"]

[deploy]
build = ["pnpm", "run", "build"]
run = ["pnpm", "run", "start"]
COZEEOF

# 创建目录结构
mkdir -p src/app src/components/ui src/lib src/hooks public

info "项目结构已创建！"
info "请等待项目代码上传..."

# 提示用户需要上传代码
warn "============================================"
warn "基础环境已安装完成！"
warn "现在需要上传项目代码"
warn "============================================"
info ""
info "请按照以下步骤上传代码："
info "1. 在你的电脑上，将整个项目文件夹压缩成 zip 文件"
info "2. 通过服务器控制面板的文件管理功能上传到 /var/www/vote-system/"
info "3. 或者使用 scp 命令上传："
info "   scp -P 22026 -r /path/to/vote-system/* root@134.122.202.240:/var/www/vote-system/"
info ""
info "上传完成后，执行以下命令完成部署："
info "cd /var/www/vote-system && pnpm install && pnpm build && pm2 start pnpm --name vote-system -- start"
