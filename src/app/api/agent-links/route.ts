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

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === 'agent') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { vote_id, agent_id, link_code, name } = body;
    const sql = getDb();

    const data = await sql`
      INSERT INTO agent_links (agent_id, vote_id, link_code, click_count, vote_count, name)
      VALUES (${agent_id}, ${vote_id}, ${link_code}, 0, 0, ${name || null})
      RETURNING *
    `;

    return NextResponse.json({ data: data[0] });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
