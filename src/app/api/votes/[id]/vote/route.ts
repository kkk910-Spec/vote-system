import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const { option_id, voter_name, voter_phone } = body;

    if (!option_id) {
      return NextResponse.json({ error: '请选择投票选项' }, { status: 400 });
    }

    // 检查投票是否存在且进行中
    const votes = await db`
      SELECT * FROM votes WHERE id = ${id}
    `;
    if (votes.length === 0) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    if (votes[0].status !== 'active') {
      return NextResponse.json({ error: '投票已结束' }, { status: 400 });
    }

    // 检查是否已投票（如果需要限制重复投票）
    if (voter_phone) {
      const existing = await db`
        SELECT * FROM vote_records WHERE vote_id = ${id} AND voter_phone = ${voter_phone}
      `;
      if (existing.length > 0) {
        return NextResponse.json({ error: '您已经投过票了' }, { status: 400 });
      }
    }

    // 记录投票
    await db`
      INSERT INTO vote_records (vote_id, option_id, voter_name, voter_phone)
      VALUES (${id}, ${option_id}, ${voter_name || ''}, ${voter_phone || ''})
    `;

    // 更新选项票数
    await db`
      UPDATE vote_options SET vote_count = vote_count + 1 WHERE id = ${option_id}
    `;

    // 更新总票数
    await db`
      UPDATE votes SET total_votes = total_votes + 1 WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, message: '投票成功' });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: '投票失败' }, { status: 500 });
  }
}
