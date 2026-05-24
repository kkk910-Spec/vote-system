import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const users = await db`
      SELECT id, username, role, is_active, name, created_at, last_login_at
      FROM users
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { username, password, role, name } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '请填写必要字段' }, { status: 400 });
    }

    const db = getDb();
    const hashedPassword = await hashPassword(password);

    const result = await db`
      INSERT INTO users (username, password, role, name, is_active, login_fail_count)
      VALUES (${username}, ${hashedPassword}, ${role || 'agent'}, ${name || username}, true, 0)
      RETURNING id, username, role, name, is_active, created_at
    `;

    return NextResponse.json({ success: true, user: result[0] });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
