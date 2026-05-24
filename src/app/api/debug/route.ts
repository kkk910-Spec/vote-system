import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createHash } from 'crypto';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. 检查环境变量
  results.env_check = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. 测试数据库连接
  try {
    const db = getDb();
    const testQuery = await db`SELECT 1 as test`;
    results.db_connection = 'OK';
  } catch (error: any) {
    results.db_connection = 'FAILED';
    results.db_error = error?.message;
    return NextResponse.json(results, { status: 500 });
  }

  // 3. 查询 admin 用户
  try {
    const db = getDb();
    const users = await db`SELECT id, username, password, role, is_active, login_fail_count, locked_until FROM users WHERE username = 'admin'`;
    if (users.length > 0) {
      const u = users[0] as any;
      results.admin_user = {
        id: u.id,
        username: u.username,
        role: u.role,
        is_active: u.is_active,
        login_fail_count: u.login_fail_count,
        locked_until: u.locked_until,
        password_prefix: u.password?.substring(0, 10) + '...',
      };
    } else {
      results.admin_user = 'NOT FOUND';
    }
  } catch (error: any) {
    results.admin_query_error = error?.message;
  }

  // 4. 测试密码哈希
  try {
    const hash = createHash('sha256').update('admin123').digest('hex');
    results.test_hash = hash;
    results.expected_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
    results.hash_match = hash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  } catch (error: any) {
    results.hash_error = error?.message;
  }

  return NextResponse.json(results, { status: 200 });
}
