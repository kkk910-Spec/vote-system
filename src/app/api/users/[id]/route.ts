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
    const updateData: Record<string, unknown> = {};

    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.role) updateData.role = body.role;
    if (body.password) {
      updateData.password = hashPassword(body.password);
    }

    const data = await sql`
      UPDATE users SET ${sql(updateData)}, updated_at = NOW() WHERE id = ${id}
      RETURNING id, username, role, is_active, created_at
    `;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data[0] });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
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
