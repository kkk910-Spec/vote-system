import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { phone_number, device_id } = body;

    if (!phone_number && !device_id) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const sql = getDb();

    // 根据 phone_number 或 device_id 找到最近的投票记录，标记 sms_clicked
    let result;
    if (phone_number) {
      result = await sql`
        UPDATE vote_records 
        SET sms_clicked = true 
        WHERE vote_id = ${id} AND phone_number = ${phone_number}
        ORDER BY created_at DESC LIMIT 1
      `;
    } else if (device_id) {
      result = await sql`
        UPDATE vote_records 
        SET sms_clicked = true 
        WHERE vote_id = ${id} AND device_id = ${device_id}
        ORDER BY created_at DESC LIMIT 1
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SMS click error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
