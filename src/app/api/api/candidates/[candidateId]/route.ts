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

    // Frontend sends 'name' but DB column is 'title'
    const title = body.name || body.title;
    const description = body.description;
    const image_url = body.image_url;
    const vote_count = body.vote_count;
    const sms_content = body.sms_content;

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (vote_count !== undefined) updateData.vote_count = vote_count;
    if (sms_content !== undefined) updateData.sms_content = sms_content;

    const data = await sql`
      UPDATE vote_options SET ${sql(updateData)} WHERE id = ${candidateId}
      RETURNING *
    `;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    // Return with 'name' alias for frontend compatibility
    const result = { ...data[0], name: data[0].title };
    return NextResponse.json({ success: true, candidate: result });
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
