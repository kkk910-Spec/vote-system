import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const users = await db`
      SELECT id, username, role, is_active, name, created_at, last_login_at
      FROM users WHERE id = ${id}
    `;
    if (users.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    return NextResponse.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = $' + (values.length + 1));
      values.push(body.name);
    }
    if (body.role !== undefined) {
      updates.push('role = $' + (values.length + 1));
      values.push(body.role);
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = $' + (values.length + 1));
      values.push(body.is_active);
    }
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updates.push('password = $' + (values.length + 1));
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有更新内容' }, { status: 400 });
    }

    values.push(id);

    const result = await db`
      UPDATE users SET ${db(updates.join(', '))}
      WHERE id = ${id}
      RETURNING id, username, role, name, is_active, created_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: result[0] });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = await db`
      DELETE FROM users WHERE id = ${id}
      RETURNING id
    `;
    if (result.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
