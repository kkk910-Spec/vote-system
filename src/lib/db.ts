import postgres from 'postgres';
import { createHash } from 'crypto';

// PostgreSQL 直连客户端
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_sql) {
    // 优先使用直连 URL，备选 pooler URL
    const databaseUrl = process.env.DATABASE_URL || process.env.COZE_DATABASE_URL || process.env.DATABASE_DIRECT_URL || '';
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    
    const isPooler = databaseUrl.includes(':6543');
    
    _sql = postgres(databaseUrl, {
      ssl: 'require',
      max: isPooler ? 1 : 3,  // pooler 模式下减少连接数
      idle_timeout: 10,
      connect_timeout: 15,
    });
  }
  return _sql;
}

// 使用 Node.js 原生 crypto 进行 SHA-256 哈希（比 Web Crypto API 更可靠）
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}
