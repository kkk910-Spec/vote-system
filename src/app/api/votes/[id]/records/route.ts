import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const records = await db`
      SELECT vr.*, vo.name as option_name
      FROM vote_records vr
      LEFT JOIN vote_options vo ON vr.option_id = vo.id
      WHERE vr.vote_id = ${id}
      ORDER BY vr.created_at DESC
    `;

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get vote records error:', error);
    return NextResponse.json({ error: '获取投票记录失败' }, { status: 500 });
  }
}
