import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sql = getDb();

    const records = await sql`
      SELECT * FROM vote_records WHERE vote_id = ${id} ORDER BY created_at DESC
    `;

    return NextResponse.json({ records });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
