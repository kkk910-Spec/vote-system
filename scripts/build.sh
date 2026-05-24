#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline

echo "Building the Next.js project..."
pnpm next build

echo "Bundling server with tsup..."
# 输出 ESM 格式，文件名为 server.js
pnpm tsup src/server.ts --format esm --platform node --target node20 --out-dir dist --no-splitting --no-minify

echo "Build completed successfully!"
ls -la dist/
