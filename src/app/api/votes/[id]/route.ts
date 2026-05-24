import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const votes = await db`
      SELECT v.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vo.id,
              'name', vo.name,
              'image_url', vo.image_url,
              'vote_count', vo.vote_count,
              'description', vo.description
            ) ORDER BY vo.id
          ) FILTER (WHERE vo.id IS NOT NULL),
          '[]'
        ) as options
      FROM votes v
      LEFT JOIN vote_options vo ON v.id = vo.vote_id
      WHERE v.id = ${id}
      GROUP BY v.id
    `;

    if (votes.length === 0) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }

    return NextResponse.json({ vote: votes[0] });
  } catch (error) {
    console.error('Get vote error:', error);
    return NextResponse.json({ error: '获取投票详情失败' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const fields: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) { fields.push('title'); values.push(body.title); }
    if (body.description !== undefined) { fields.push('description'); values.push(body.description); }
    if (body.start_time !== undefined) { fields.push('start_time'); values.push(body.start_time); }
    if (body.end_time !== undefined) { fields.push('end_time'); values.push(body.end_time); }
    if (body.status !== undefined) { fields.push('status'); values.push(body.status); }
    if (body.is_public !== undefined) { fields.push('is_public'); values.push(body.is_public); }

    if (fields.length > 0) {
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      values.push(id);
      await db.unsafe(`UPDATE votes SET ${setClause} WHERE id = $${values.length}`, values);
    }

    // 更新选项
    if (body.options) {
      // 先删除旧选项
      await db`DELETE FROM vote_options WHERE vote_id = ${id}`;
      // 插入新选项
      for (const option of body.options) {
        await db`
          INSERT INTO vote_options (vote_id, name, image_url, description, vote_count)
          VALUES (${id}, ${option.name}, ${option.image_url || null}, ${option.description || ''}, ${option.vote_count || 0})
        `;
      }
    }

    // 重新查询
    const updated = await db`
      SELECT v.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', vo.id,
              'name', vo.name,
              'image_url', vo.image_url,
              'vote_count', vo.vote_count,
              'description', vo.description
            ) ORDER BY vo.id
          ) FILTER (WHERE vo.id IS NOT NULL),
          '[]'
        ) as options
      FROM votes v
      LEFT JOIN vote_options vo ON v.id = vo.vote_id
      WHERE v.id = ${id}
      GROUP BY v.id
    `;

    return NextResponse.json({ success: true, vote: updated[0] });
  } catch (error) {
    console.error('Update vote error:', error);
    return NextResponse.json({ error: '更新投票失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // 删除关联的投票记录
    await db`DELETE FROM vote_records WHERE vote_id = ${id}`;
    // 删除关联的选项
    await db`DELETE FROM vote_options WHERE vote_id = ${id}`;
    // 删除投票
    const result = await db`DELETE FROM votes WHERE id = ${id} RETURNING id`;

    if (result.length === 0) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete vote error:', error);
    return NextResponse.json({ error: '删除投票失败' }, { status: 500 });
  }
}
