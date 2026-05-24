import postgres from 'postgres';

// PostgreSQL 直连客户端（用于 Vercel 等非 Coze 环境）
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_sql) {
    const databaseUrl = process.env.DATABASE_URL || process.env.COZE_DATABASE_URL || '';
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    _sql = postgres(databaseUrl, {
      ssl: 'require',
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}

// 导出 sql 作为 getDb() 的快捷方式
export const sql = getDb();

// SHA-256 哈希函数
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
