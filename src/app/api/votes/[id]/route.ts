import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();

    const voteRows = await sql`
      SELECT * FROM votes WHERE id = ${id}
    `;

    if (!voteRows || voteRows.length === 0) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }

    const options = await sql`
      SELECT * FROM vote_options WHERE vote_id = ${id}
    `;

    // Add 'name' alias for frontend compatibility (DB column is 'title')
    const candidates = options.map((o: Record<string, unknown>) => ({ ...o, name: o.title }));
    return NextResponse.json({ vote: { ...voteRows[0], options: candidates, candidates } });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const sql = getDb();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.start_time !== undefined) updateData.start_time = body.start_time;
    if (body.end_time !== undefined) updateData.end_time = body.end_time;
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.sms_number !== undefined) updateData.sms_number = body.sms_number;
    if (body.cover_image !== undefined) updateData.cover_image = body.cover_image;
    if (body.top_text !== undefined) updateData.top_text = body.top_text;
    if (body.vote_text !== undefined) updateData.vote_text = body.vote_text;

    const updated = await sql`
      UPDATE votes SET ${sql(updateData)}, updated_at = NOW() WHERE id = ${id}
      RETURNING *
    `;

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, vote: updated[0] });
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
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const sql = getDb();

    // 删除选项
    await sql`DELETE FROM vote_options WHERE vote_id = ${id}`;
    // 删除记录
    await sql`DELETE FROM vote_records WHERE vote_id = ${id}`;
    // 删除投票
    await sql`DELETE FROM votes WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
