#!/bin/bash
# 投票系统一键部署脚本
# 域名: exmosjksgg.top

set -e

echo "=========================================="
echo "投票系统一键部署脚本"
echo "=========================================="

# 配置变量
DOMAIN="exmosjksgg.top"
PROJECT_DIR="/var/www/vote-system"

# 创建项目目录
echo "[1/8] 创建项目目录..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 创建 package.json
echo "[2/8] 创建 package.json..."
cat > package.json << 'PKGEOF'
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
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
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
PKGEOF

# 创建 next.config.ts
echo "[3/8] 创建 next.config.ts..."
cat > next.config.ts << 'NCEOF'
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["*.exmosjksgg.top", "localhost:5000"],
    },
  },
};

export default nextConfig;
NCEOF

# 创建 tsconfig.json
cat > tsconfig.json << 'TSEOF'
{
  "compilerOptions": {
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

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  },
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
TWEOF

# 创建 postcss.config.mjs
cat > postcss.config.mjs << 'PCEOF'
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
PCEOF

# 创建 .env 文件（需要用户填写）
echo "[4/8] 创建环境变量文件..."
cat > .env << 'ENVEOF'
# 数据库配置 (Supabase)
DATABASE_URL=你的Supabase数据库连接字符串
SUPABASE_URL=你的Supabase项目URL
SUPABASE_ANON_KEY=你的Supabase匿名密钥

# 服务配置
PORT=5000
NODE_ENV=production
COZE_PROJECT_DOMAIN_DEFAULT=https://exmosjksgg.top
ENVEOF

echo "=========================================="
echo "重要提示：需要配置数据库信息！"
echo "=========================================="
echo ""
echo "请编辑 /var/www/vote-system/.env 文件"
echo "填入你的 Supabase 数据库信息"
echo ""
echo "执行命令: nano /var/www/vote-system/.env"
echo ""
echo "=========================================="

# 创建目录结构
echo "[5/8] 创建目录结构..."
mkdir -p src/app/api
mkdir -p src/components/ui
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p public

# 创建基础文件
echo "[6/8] 创建基础文件..."

# 创建 lib/utils.ts
mkdir -p src/lib
cat > src/lib/utils.ts << 'UTILEOF'
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
UTILEOF

# 创建 globals.css
cat > src/app/globals.css << 'CSSEOF'
@import "tailwindcss";
CSSEOF

# 创建 layout.tsx
cat > src/app/layout.tsx << 'LAYOUTEOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "投票系统",
  description: "在线投票平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
LAYOUTEOF

# 创建简单的主页
cat > src/app/page.tsx << 'PAGEEOF'
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">投票系统</h1>
        <p className="text-gray-600 mb-8">系统正在配置中...</p>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <p className="text-sm text-gray-500">
            请完成以下步骤：
          </p>
          <ol className="text-left text-sm text-gray-700 mt-4 space-y-2">
            <li>1. 编辑 .env 文件配置数据库</li>
            <li>2. 运行 pnpm install 安装依赖</li>
            <li>3. 运行 pnpm build 构建项目</li>
            <li>4. 运行 pm2 start 启动服务</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
PAGEEOF

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

echo "[7/8] 安装依赖..."
pnpm install

echo "[8/8] 构建项目..."
pnpm build

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 编辑数据库配置: nano /var/www/vote-system/.env"
echo "2. 启动服务: pm2 start pnpm --name vote-system -- start"
echo "3. 配置 Nginx 和 SSL"
echo ""
