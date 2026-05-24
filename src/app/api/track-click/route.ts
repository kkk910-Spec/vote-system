import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { link_id, visitor_id } = body;

    if (!link_id || !visitor_id) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const link = await db`
      SELECT * FROM agent_links WHERE id = ${link_id}
    `;

    if (link.length === 0) {
      return NextResponse.json({ error: '链接不存在' }, { status: 404 });
    }

    await db`
      INSERT INTO click_tracks (link_id, visitor_id, clicked_at)
      VALUES (${link_id}, ${visitor_id}, NOW())
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track click error:', error);
    return NextResponse.json({ error: '记录点击失败' }, { status: 500 });
  }
}
