import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. 环境变量检查
  results.env_check = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST || 'NOT SET',
    DB_PORT: process.env.DB_PORT || 'NOT SET',
    DB_USER: process.env.DB_USER || 'NOT SET',
    DB_PASSWORD_set: !!process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME || 'NOT SET',
  };

  // 2. 测试 PostgreSQL TCP 连接 (Railway)
  try {
    const postgres = (await import('postgres')).default;
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      let sql: ReturnType<typeof postgres> | null = null;
      try {
        sql = postgres(databaseUrl, { ssl: 'require', max: 1, connect_timeout: 10 });
        const r = await sql`SELECT NOW() as now, version() as ver`;
        results.railway_pg = { status: 'OK', result: JSON.stringify(r) };
      } catch (e) {
        results.railway_pg = {
          error: (e as Error).message?.substring(0, 300),
          code: (e as { code?: string }).code,
        };
      } finally {
        if (sql) {
          try { await sql.end(); } catch { /* ignore */ }
        }
      }
    } else {
      results.railway_pg = { error: 'DATABASE_URL not set' };
    }
  } catch (err) {
    results.railway_pg = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  return NextResponse.json(results, { status: 200 });
}
