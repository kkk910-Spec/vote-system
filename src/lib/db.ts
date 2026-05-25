import postgres from 'postgres';
import { createHash } from 'crypto';

// PostgreSQL 直连 - 通过 Railway 公网代理访问
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sql: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDb(): any {
  if (!_sql) {
    const databaseUrl = process.env.DATABASE_URL || '';

    if (databaseUrl) {
      console.log('[DB] 使用 DATABASE_URL 连接');
      _sql = postgres(databaseUrl, {
        ssl: 'require',
        max: 5,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    } else {
      // 使用分离的环境变量构建连接
      const dbHost = process.env.DB_HOST || '';
      const dbPort = process.env.DB_PORT || '5432';
      const dbUser = process.env.DB_USER || '';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'postgres';

      if (dbHost && dbUser && dbPassword) {
        console.log(`[DB] 使用分离参数连接: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
        _sql = postgres({
          host: dbHost,
          port: parseInt(dbPort, 10),
          database: dbName,
          username: dbUser,
          password: dbPassword,
          ssl: 'require',
          max: 5,
          idle_timeout: 20,
          connect_timeout: 10,
        });
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
