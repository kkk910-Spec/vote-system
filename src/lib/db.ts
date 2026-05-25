import { neon } from '@neondatabase/serverless';

// Neon Serverless 驱动 - 通过 HTTP/WebSocket 连接，完美适配 Vercel serverless
let _sql: ReturnType<typeof neon> | null = null;

export function getDb() {
  if (!_sql) {
    // 优先使用 Neon 连接字符串
    const databaseUrl = process.env.DATABASE_URL || process.env.COZE_DATABASE_URL || '';
    
    if (databaseUrl) {
      console.log('[DB] 使用 DATABASE_URL 连接 (Neon serverless)');
      _sql = neon(databaseUrl);
    } else {
      // 使用分离的环境变量构建连接
      const dbHost = process.env.DB_HOST;
      const dbUser = process.env.DB_USER;
      const dbPassword = process.env.DB_PASSWORD;
      const dbName = process.env.DB_NAME || 'postgres';
      
      if (dbHost && dbUser && dbPassword) {
        // 构建 URL，密码需要编码
        const encodedPassword = encodeURIComponent(dbPassword);
        const url = `postgresql://${dbUser}:${encodedPassword}@${dbHost}/${dbName}?sslmode=require`;
        console.log(`[DB] 使用分离参数连接: ${dbUser}@${dbHost}/${dbName}`);
        _sql = neon(url);
      } else {
        throw new Error('No database configuration found. Set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD');
      }
    }
  }
  return _sql;
}

// 使用 Node.js 原生 crypto 进行 SHA-256 哈希
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

import { createHash } from 'crypto';
