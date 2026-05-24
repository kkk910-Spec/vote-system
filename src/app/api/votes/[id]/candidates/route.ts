import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const candidates = await db`
      SELECT * FROM vote_options WHERE vote_id = ${id} ORDER BY id
    `;

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error('Get candidates error:', error);
    return NextResponse.json({ error: '获取候选人列表失败' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const result = await db`
      INSERT INTO vote_options (vote_id, name, image_url, description, vote_count)
      VALUES (${id}, ${body.name}, ${body.image_url || null}, ${body.description || ''}, 0)
      RETURNING *
    `;

    return NextResponse.json({ success: true, candidate: result[0] });
  } catch (error) {
    console.error('Create candidate error:', error);
    return NextResponse.json({ error: '添加候选人失败' }, { status: 500 });
  }
}
