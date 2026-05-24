import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const votes = await db`
      SELECT v.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vo.id,
              'name', vo.title,
              'image_url', vo.image_url,
              'vote_count', vo.vote_count,
              'description', vo.description
            ) ORDER BY vo.id
          ) FILTER (WHERE vo.id IS NOT NULL),
          '[]'
        ) as options
      FROM votes v
      LEFT JOIN vote_options vo ON v.id = vo.vote_id
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `;
    return NextResponse.json({ votes });
  } catch (error) {
    console.error('Get votes error:', error);
    return NextResponse.json({ error: '获取投票列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, start_time, end_time, status, is_public, created_by, options } = body;

    if (!title) {
      return NextResponse.json({ error: '请填写投票标题' }, { status: 400 });
    }

    const db = getDb();

    const voteResult = await db`
      INSERT INTO votes (title, description, start_time, end_time, status, is_public, created_by, total_votes)
      VALUES (${title}, ${description || ''}, ${start_time || null}, ${end_time || null}, ${status || 'active'}, ${is_public !== false}, ${created_by || null}, 0)
      RETURNING *
    `;

    const vote = voteResult[0] as any;

    // 插入选项
    if (options && options.length > 0) {
      for (const option of options) {
        await db`
          INSERT INTO vote_options (vote_id, title, image_url, description, vote_count)
          VALUES (${vote.id}, ${option.name || option.title}, ${option.image_url || null}, ${option.description || ''}, 0)
        `;
      }
    }

    // 重新查询带选项的投票
    const fullVote = await db`
      SELECT v.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vo.id,
              'name', vo.title,
              'image_url', vo.image_url,
              'vote_count', vo.vote_count,
              'description', vo.description
            ) ORDER BY vo.id
          ) FILTER (WHERE vo.id IS NOT NULL),
          '[]'
        ) as options
      FROM votes v
      LEFT JOIN vote_options vo ON v.id = vo.vote_id
      WHERE v.id = ${vote.id}
      GROUP BY v.id
    `;

    return NextResponse.json({ success: true, vote: fullVote[0] });
  } catch (error) {
    console.error('Create vote error:', error);
    return NextResponse.json({ error: '创建投票失败' }, { status: 500 });
  }
}
