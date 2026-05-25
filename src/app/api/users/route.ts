import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const sql = getDb();
    const data = await sql`
      SELECT id, username, role, is_active, created_at, name, phone FROM users ORDER BY created_at ASC
    `;

    return NextResponse.json({ users: data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, role } = body;
    const hashedPassword = hashPassword(password);

    const sql = getDb();
    const data = await sql`
      INSERT INTO users (username, password, role, is_active, login_fail_count)
      VALUES (${username}, ${hashedPassword}, ${role || 'agent'}, true, 0)
      RETURNING id, username, role, is_active, created_at
    `;

    return NextResponse.json({ success: true, user: data[0] });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
