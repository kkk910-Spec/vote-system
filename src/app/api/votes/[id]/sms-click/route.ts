import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { record_id, phone_number, device_id, link_code } = body;

    const sql = getDb();

    // 优先用 record_id 精确匹配
    if (record_id) {
      await sql`
        UPDATE vote_records 
        SET sms_clicked = true 
        WHERE id = ${record_id} AND vote_id = ${id}
      `;
      return NextResponse.json({ success: true });
    }

    // 兼容：通过 link_code 找到 agent_id，再找最近的记录
    if (link_code) {
      const linkData = await sql`
        SELECT agent_id FROM agent_links WHERE link_code = ${link_code}
      `;
      if (linkData && linkData.length > 0) {
        const agentId = linkData[0].agent_id as string;
        await sql`
          UPDATE vote_records 
          SET sms_clicked = true 
          WHERE vote_id = ${id} AND agent_id = ${agentId}
          ORDER BY created_at DESC LIMIT 1
        `;
        return NextResponse.json({ success: true });
      }
    }

    // 兜底：用 phone_number
    if (phone_number) {
      await sql`
        UPDATE vote_records 
        SET sms_clicked = true 
        WHERE vote_id = ${id} AND phone_number = ${phone_number}
        ORDER BY created_at DESC LIMIT 1
      `;
      return NextResponse.json({ success: true });
    }

    // 兜底：用 device_id
    if (device_id) {
      await sql`
        UPDATE vote_records 
        SET sms_clicked = true 
        WHERE vote_id = ${id} AND device_id = ${device_id}
        ORDER BY created_at DESC LIMIT 1
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  } catch (error) {
    console.error('SMS click error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
