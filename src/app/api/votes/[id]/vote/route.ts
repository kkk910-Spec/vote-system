import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { option_id, candidate_id, phone_number, device_id, ip_address, agent_id, source_link } = body;

    if (!option_id && !candidate_id) {
      return NextResponse.json({ error: '请选择投票选项' }, { status: 400 });
    }

    const sql = getDb();
    const selectedOptionId = option_id || candidate_id;

    // 检查投票是否存在且进行中
    const voteRows = await sql`
      SELECT status, sms_number FROM votes WHERE id = ${id}
    `;

    if (!voteRows || voteRows.length === 0) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    if ((voteRows[0].status as string) !== 'active') {
      return NextResponse.json({ error: '投票已结束' }, { status: 400 });
    }

    // 检查是否已投票（同一设备/同一投票）
    if (device_id) {
      const existing = await sql`
        SELECT id FROM vote_records 
        WHERE vote_id = ${id} AND device_id = ${device_id}
        LIMIT 1
      `;
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: '您已经投过票了' }, { status: 400 });
      }
    }

    // 获取候选人短信内容
    const optionData = await sql`
      SELECT sms_content FROM vote_options WHERE id = ${selectedOptionId}
    `;
    const smsContent = optionData.length > 0 ? (optionData[0].sms_content as string) : '';

    // 记录投票
    await sql`
      INSERT INTO vote_records (vote_id, option_id, candidate_id, phone_number, device_id, ip_address, agent_id, source_link, voter_ip)
      VALUES (${id}, ${selectedOptionId}, ${selectedOptionId}, ${phone_number || null}, ${device_id || null}, ${ip_address || null}, ${agent_id || null}, ${source_link || null}, ${ip_address || null})
    `;

    // 更新选项票数
    await sql`
      UPDATE vote_options SET vote_count = vote_count + 1 WHERE id = ${selectedOptionId}
    `;

    // 更新投票总票数
    await sql`
      UPDATE votes SET total_votes = total_votes + 1 WHERE id = ${id}
    `;

    const smsInfo = {
      number: (voteRows[0].sms_number as string) || '106988881700511',
      content: smsContent || ''
    };

    return NextResponse.json({
      success: true,
      sms_info: smsInfo
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
