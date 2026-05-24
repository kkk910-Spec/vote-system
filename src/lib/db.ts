import postgres from 'postgres';
import { createHash } from 'crypto';

// PostgreSQL 直连客户端
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_sql) {
    const databaseUrl = process.env.DATABASE_URL || process.env.COZE_DATABASE_URL || '';
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    _sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}

// 使用 Node.js 原生 crypto 进行 SHA-256 哈希（比 Web Crypto API 更可靠）
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
