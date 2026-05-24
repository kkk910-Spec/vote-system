import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';

export async function GET() {
  const results: Record<string, any> = {};

  // 1. 检查环境变量
  results.env_check = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    DATABASE_URL_prefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
  };

  // 2. 测试数据库连接
  try {
    const db = getDb();
    const testQuery = await db`SELECT 1 as test`;
    results.db_connection = 'OK';
    results.db_test = testQuery;
  } catch (error: any) {
    results.db_connection = 'FAILED';
    results.db_error = error?.message;
  }

  // 3. 测试查询 users 表
  try {
    const db = getDb();
    const users = await db`SELECT id, username, role, is_active, login_fail_count, locked_until FROM users WHERE username = 'admin'`;
    results.admin_user = users[0] || 'NOT FOUND';
  } catch (error: any) {
    results.admin_query_error = error?.message;
  }

  // 4. 测试密码哈希
  try {
    const hash = await hashPassword('admin123');
    results.password_hash = hash;
    results.hash_match = hash === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  } catch (error: any) {
    results.hash_error = error?.message;
  }

  return NextResponse.json(results, { status: 200 });
}
