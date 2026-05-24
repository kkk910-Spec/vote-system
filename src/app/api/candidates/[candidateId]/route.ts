import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const body = await request.json();
    const db = getDb();

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(body.name);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(body.image_url);
    }
    if (body.vote_count !== undefined) {
      updates.push(`vote_count = $${paramIndex++}`);
      values.push(body.vote_count);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '没有更新内容' }, { status: 400 });
    }

    values.push(candidateId);

    const result = await db`
      UPDATE vote_options SET ${db(updates.join(', '))}
      WHERE id = ${candidateId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate: result[0] });
  } catch (error) {
    console.error('Update candidate error:', error);
    return NextResponse.json({ error: '更新候选人失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const db = getDb();

    await db`DELETE FROM vote_records WHERE option_id = ${candidateId}`;
    await db`DELETE FROM vote_options WHERE id = ${candidateId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return NextResponse.json({ error: '删除候选人失败' }, { status: 500 });
  }
}
