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

    // Add 'name' alias for frontend compatibility (DB column is 'title')
    const candidates = options.map((o: Record<string, unknown>) => ({ ...o, name: o.title }));
    return NextResponse.json({ candidates });
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

    // Frontend sends 'name' but DB column is 'title'
    const body = await request.json();
    const title = body.name || body.title;
    const { description, image_url, sms_content } = body;

    if (!title) {
      return NextResponse.json({ error: '请填写选项标题' }, { status: 400 });
    }

    const sql = getDb();

    const data = await sql`
      INSERT INTO vote_options (vote_id, title, description, image_url, sms_content)
      VALUES (${id}, ${title}, ${description || ''}, ${image_url || ''}, ${sms_content || ''})
      RETURNING *
    `;

    // Return with 'name' alias for frontend compatibility
    const result = { ...data[0], name: data[0].title };
    return NextResponse.json({ success: true, candidate: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
