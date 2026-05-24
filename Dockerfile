FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制 package.json
COPY package.json ./

# 安装依赖（不使用 frozen-lockfile）
RUN pnpm install

# 复制源代码
COPY . .

# 构建
RUN pnpm next build
RUN pnpm tsup src/server.ts --format esm --platform node --target node20 --out-dir dist --no-splitting --no-minify

# 设置端口
ENV PORT=5000

# 启动
CMD ["node", "dist/server.js"]
