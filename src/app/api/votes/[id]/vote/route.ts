import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { option_id, candidate_id, phone_number, device_id, ip_address, agent_id, source_link, link_code } = body;

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

    // 检查是否已投票（同一手机号/同一投票，每人最多2票）
    if (phone_number) {
      const existing = await sql`
        SELECT id FROM vote_records 
        WHERE vote_id = ${id} AND phone_number = ${phone_number}
      `;
      if (existing && existing.length >= 2) {
        return NextResponse.json({ error: '您的投票次数已用完（每人最多2票）' }, { status: 400 });
      }
    }
    // 同一设备也限制
    if (device_id) {
      const existingDevice = await sql`
        SELECT id FROM vote_records 
        WHERE vote_id = ${id} AND device_id = ${device_id}
      `;
      if (existingDevice && existingDevice.length >= 2) {
        return NextResponse.json({ error: '您的投票次数已用完（每人最多2票）' }, { status: 400 });
      }
    }

    // 通过 link_code 查出代理ID
    let resolvedAgentId = agent_id || null;
    let resolvedSourceLink = source_link || null;
    const refCode = link_code || source_link;
    if (refCode) {
      const linkData = await sql`
        SELECT agent_id, link_code FROM agent_links WHERE link_code = ${refCode}
      `;
      if (linkData && linkData.length > 0) {
        resolvedAgentId = linkData[0].agent_id as string;
        resolvedSourceLink = linkData[0].link_code as string;
        // 更新代理链接的点击和投票计数
        await sql`
          UPDATE agent_links SET click_count = click_count + 1, vote_count = vote_count + 1 WHERE link_code = ${refCode}
        `;
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
      VALUES (${id}, ${selectedOptionId}, ${selectedOptionId}, ${phone_number || null}, ${device_id || null}, ${ip_address || null}, ${resolvedAgentId}, ${resolvedSourceLink}, ${ip_address || null})
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
