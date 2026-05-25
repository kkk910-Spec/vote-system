import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const votes = await sql`
      SELECT * FROM votes ORDER BY created_at DESC
    `;

    // 获取所有选项
    const options = await sql`
      SELECT * FROM vote_options
    `;

    // 合并选项到投票
    const votesWithOptions = votes.map((vote: Record<string, unknown>) => {
      const voteOptions = options.filter((opt: Record<string, unknown>) => opt.vote_id === vote.id);
      // Add 'name' alias for frontend compatibility (DB column is 'title')
      const candidates = voteOptions.map((o: Record<string, unknown>) => ({ ...o, name: o.title }));
      return {
        ...vote,
        options: candidates,
        candidates,
      };
    });

    return NextResponse.json({ votes: votesWithOptions });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'agent') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, start_time, end_time, is_public, options, status } = body;

    if (!title) {
      return NextResponse.json({ error: '请填写投票标题' }, { status: 400 });
    }

    const sql = getDb();

    // 创建投票
    const voteRows = await sql`
      INSERT INTO votes (title, description, start_time, end_time, is_public, status, created_by)
      VALUES (${title}, ${description || ''}, ${start_time || null}, ${end_time || null}, ${is_public !== false}, ${status || 'active'}, ${user.id})
      RETURNING *
    `;

    const vote = voteRows[0];

    // 创建选项
    if (options && options.length > 0) {
      for (const opt of options) {
        const optTitle = typeof opt === 'string' ? opt : ((opt as Record<string, unknown>).title || (opt as Record<string, unknown>).name || '');
        const optDesc = typeof opt === 'string' ? '' : ((opt as Record<string, unknown>).description || '');
        const optImage = typeof opt === 'string' ? '' : ((opt as Record<string, unknown>).image_url || '');

        await sql`
          INSERT INTO vote_options (vote_id, title, description, image_url)
          VALUES (${vote.id as string}, ${optTitle}, ${optDesc}, ${optImage})
        `;
      }
    }

    // 重新获取带选项的投票
    const fullVoteRows = await sql`
      SELECT * FROM votes WHERE id = ${vote.id as string}
    `;
    const voteOptions = await sql`
      SELECT * FROM vote_options WHERE vote_id = ${vote.id as string}
    `;

    return NextResponse.json({ success: true, vote: { ...fullVoteRows[0], options: voteOptions, candidates: voteOptions } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
