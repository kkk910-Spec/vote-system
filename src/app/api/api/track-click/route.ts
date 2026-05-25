import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { link_code, ip_address, visitor_id } = body;

    if (!link_code) {
      return NextResponse.json({ error: '缺少链接代码' }, { status: 400 });
    }

    const sql = getDb();

    // 查找 agent_link
    const links = await sql`
      SELECT id, vote_id FROM agent_links WHERE link_code = ${link_code} LIMIT 1
    `;

    if (!links || links.length === 0) {
      return NextResponse.json({ error: '链接不存在' }, { status: 404 });
    }

    const link = links[0];

    // 记录点击（避免重复）
    const visitorId = visitor_id || ip_address || 'unknown';
    try {
      await sql`
        INSERT INTO click_tracks (link_id, visitor_id)
        VALUES (${link.id as string}, ${visitorId})
      `;
    } catch {
      // 可能已存在，忽略
    }

    // 更新点击计数
    await sql`
      UPDATE agent_links SET click_count = click_count + 1 WHERE id = ${link.id as string}
    `;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
