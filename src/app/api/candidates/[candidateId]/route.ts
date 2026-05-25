import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const body = await request.json();
    const sql = getDb();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.vote_count !== undefined) updateData.vote_count = body.vote_count;

    const data = await sql`
      UPDATE vote_options SET ${sql(updateData)} WHERE id = ${candidateId}
      RETURNING *
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
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const sql = getDb();

    await sql`DELETE FROM vote_options WHERE id = ${candidateId}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
