import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. 环境变量检查
  results.env_check = {
    DB_HOST: process.env.DB_HOST || 'NOT SET',
    DB_PORT: process.env.DB_PORT || 'NOT SET',
    DB_USER: process.env.DB_USER || 'NOT SET',
    DB_PASSWORD_set: !!process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME || 'NOT SET',
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY_set: !!process.env.SUPABASE_ANON_KEY,
  };

  // 2. 测试 Supabase REST API (HTTP)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mapmvufwcsobaxwovmms.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.COZE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?select=id,username,role&limit=1`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      results.rest_api_anon = {
        status: res.status,
        ok: res.ok,
        data: JSON.stringify(data).substring(0, 300),
      };
    } catch (err) {
      results.rest_api_anon = {
        error: err instanceof Error ? err.message : 'Unknown',
      };
    }
  }

  if (serviceKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?select=id,username,role&limit=1`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      results.rest_api_service = {
        status: res.status,
        ok: res.ok,
        data: JSON.stringify(data).substring(0, 300),
      };
    } catch (err) {
      results.rest_api_service = {
        error: err instanceof Error ? err.message : 'Unknown',
      };
    }
  }

  // 3. 测试 PostgreSQL TCP 连接 - 多种方式
  try {
    const postgres = (await import('postgres')).default;
    
    const connections = [
      {
        name: 'tcp_direct_ipv6',
        url: 'postgresql://postgres:Vote2025Secure@db.mapmvufwcsobaxwovmms.supabase.co:5432/postgres',
      },
      {
        name: 'tcp_pooler_session',
        url: 'postgresql://postgres.mapmvufwcsobaxwovmms:Vote2025Secure@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
      },
      {
        name: 'tcp_pooler_transaction',
        url: 'postgresql://postgres.mapmvufwcsobaxwovmms:Vote2025Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
      },
      {
        name: 'tcp_pooler_token_6543',
        url: 'postgresql://postgres.E82huelmgD34B7AT@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
      },
      {
        name: 'tcp_neon_direct',
        url: 'postgresql://postgres:Vote2025Secure@cp-happy-glow-e52cd1e4.us-east-2.aws.neon.tech/postgres',
      },
    ];

    for (const conn of connections) {
      let sql: ReturnType<typeof postgres> | null = null;
      try {
        sql = postgres(conn.url, { ssl: 'require', max: 1, connect_timeout: 10 });
        const r = await sql`SELECT 1 as test`;
        (results as Record<string, unknown>)[conn.name] = { status: 'OK', result: JSON.stringify(r) };
      } catch (e) {
        (results as Record<string, unknown>)[conn.name] = { 
          error: (e as Error).message?.substring(0, 200),
          code: (e as {code?: string}).code,
        };
      } finally {
        if (sql) {
          try { await sql.end(); } catch { /* ignore */ }
        }
      }
    }
  } catch (err) {
    results.tcp_tests = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  // 4. 测试 Supabase Auth API
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`);
    const data = await res.text();
    results.auth_health = {
      status: res.status,
      data: data.substring(0, 200),
    };
  } catch (err) {
    results.auth_health = { error: err instanceof Error ? err.message : 'Unknown' };
  }

  return NextResponse.json(results, { status: 200 });
}
