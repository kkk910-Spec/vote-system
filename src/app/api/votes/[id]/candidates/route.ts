import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();

    const options = await sql`
      SELECT * FROM vote_options WHERE vote_id = ${id} ORDER BY created_at ASC
    `;

    return NextResponse.json({ data: options });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(
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
    const { title, description, image_url } = body;

    if (!title) {
      return NextResponse.json({ error: '请填写选项标题' }, { status: 400 });
    }

    const sql = getDb();

    const data = await sql`
      INSERT INTO vote_options (vote_id, title, description, image_url)
      VALUES (${id}, ${title}, ${description || ''}, ${image_url || ''})
      RETURNING *
    `;

    return NextResponse.json({ data: data[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
