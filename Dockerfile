FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制 package.json
COPY package.json ./

# 安装依赖
RUN pnpm install

# 复制源代码
COPY . .

# 构建
RUN pnpm next build
RUN pnpm tsup src/server.ts --format esm --platform node --target node20 --out-dir dist --no-splitting --no-minify

# 暴露端口（Railway 会自动设置 PORT 环境变量）
EXPOSE 5000

# 启动
CMD ["node", "dist/server.js"]
