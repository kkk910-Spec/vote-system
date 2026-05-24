import postgres from 'postgres';
import { createHash } from 'crypto';

// PostgreSQL 直连客户端 - 使用分离的连接参数避免 URL 编码问题
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_sql) {
    // 优先使用分离的环境变量，备选 URL 格式
    const dbHost = process.env.DB_HOST;
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbName = process.env.DB_NAME || 'postgres';
    const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

    if (dbHost && dbUser && dbPassword) {
      // 使用分离参数连接（避免 URL 编码问题）
      console.log(`[DB] 使用分离参数连接: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
      _sql = postgres({
        host: dbHost,
        port: dbPort,
        username: dbUser,
        password: dbPassword,
        database: dbName,
        ssl: 'require',
        max: 1,
        idle_timeout: 10,
        connect_timeout: 15,
      });
    } else {
      // 降级使用 URL 格式
      const databaseUrl = process.env.DATABASE_URL || process.env.COZE_DATABASE_URL || process.env.DATABASE_DIRECT_URL || '';
      if (!databaseUrl) {
        throw new Error('No database configuration found. Set DB_HOST/DB_USER/DB_PASSWORD or DATABASE_URL');
      }
      console.log(`[DB] 使用 URL 连接`);
      const isPooler = databaseUrl.includes(':6543');
      _sql = postgres(databaseUrl, {
        ssl: 'require',
        max: isPooler ? 1 : 3,
        idle_timeout: 10,
        connect_timeout: 15,
      });
    }
  }
  return _sql;
}

// 使用 Node.js 原生 crypto 进行 SHA-256 哈希
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
