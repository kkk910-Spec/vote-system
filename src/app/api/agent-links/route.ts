import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const links = await db`
      SELECT al.*, v.title as vote_title
      FROM agent_links al
      LEFT JOIN votes v ON al.vote_id = v.id
      ORDER BY al.created_at DESC
    `;
    return NextResponse.json({ links });
  } catch (error) {
    console.error('Get agent links error:', error);
    return NextResponse.json({ error: '获取代理链接失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { vote_id, agent_id, code, max_uses } = body;

    const result = await db`
      INSERT INTO agent_links (vote_id, agent_id, code, max_uses, used_count)
      VALUES (${vote_id}, ${agent_id}, ${code}, ${max_uses || 0}, 0)
      RETURNING *
    `;

    return NextResponse.json({ success: true, link: result[0] });
  } catch (error) {
    console.error('Create agent link error:', error);
    return NextResponse.json({ error: '创建代理链接失败' }, { status: 500 });
  }
}
