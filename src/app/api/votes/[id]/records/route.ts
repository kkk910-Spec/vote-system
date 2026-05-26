import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const sql = getDb();

    let records;
    if (user.role === 'agent') {
      // 代理只能看到通过自己推广链接进入的记录
      records = await sql`
        SELECT vr.*, u.name as agent_name, v.title as vote_title
        FROM vote_records vr
        LEFT JOIN users u ON vr.agent_id = u.id
        LEFT JOIN votes v ON vr.vote_id = v.id
        WHERE vr.vote_id = ${id} AND vr.agent_id = ${user.id}
        ORDER BY vr.created_at DESC
      `;
    } else {
      // 管理员可以看到所有记录
      records = await sql`
        SELECT vr.*, u.name as agent_name, v.title as vote_title
        FROM vote_records vr
        LEFT JOIN users u ON vr.agent_id = u.id
        LEFT JOIN votes v ON vr.vote_id = v.id
        WHERE vr.vote_id = ${id}
        ORDER BY vr.created_at DESC
      `;
    }

    return NextResponse.json({ records });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
