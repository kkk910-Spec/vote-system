import { NextRequest, NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const sql = getDb();

    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      values.push(body.is_active);
    }
    if (body.role) {
      updates.push(`role = $${paramIdx++}`);
      values.push(body.role);
    }
    if (body.name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(body.name);
    }
    if (body.phone !== undefined) {
      updates.push(`phone = $${paramIdx++}`);
      values.push(body.phone);
    }
    if (body.password) {
      updates.push(`password = $${paramIdx++}`);
      values.push(hashPassword(body.password));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, username, role, is_active, created_at, name, phone`;
    const data = await sql.unsafe(query, values);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data[0] });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(request, { params });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const sql = getDb();
    await sql`DELETE FROM users WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
