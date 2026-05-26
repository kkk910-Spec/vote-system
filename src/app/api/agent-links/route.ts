import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const sql = getDb();

    let data;
    if (user.role === 'agent') {
      data = await sql`
        SELECT * FROM agent_links WHERE agent_id = ${user.id} ORDER BY created_at DESC
      `;
    } else {
      data = await sql`
        SELECT * FROM agent_links ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ links: data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { vote_id, agent_id, link_code, name } = body;
    const sql = getDb();

    // 代理只能给自己生成链接，管理员可以指定代理
    const targetAgentId = user.role === 'agent' ? user.id : agent_id;
    if (!targetAgentId) {
      return NextResponse.json({ error: '请选择代理' }, { status: 400 });
    }

    // 生成唯一链接码
    const newLinkCode = link_code || Math.random().toString(36).substring(2, 8);

    const data = await sql`
      INSERT INTO agent_links (agent_id, vote_id, link_code, click_count, vote_count, name)
      VALUES (${targetAgentId}, ${vote_id}, ${newLinkCode}, 0, 0, ${name || null})
      RETURNING *
    `;

    return NextResponse.json({ success: true, link: data[0] });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
