import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 提交投票
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();
    
    const body = await request.json();
    const { candidate_id, phone_number, device_id, link_code } = body;
    
    if (!candidate_id || !phone_number) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone_number)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
    }
    
    // 获取投票信息
    const { data: vote } = await client
      .from('votes')
      .select('id, status, sms_number')
      .eq('id', id)
      .maybeSingle();
    
    if (!vote) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    
    if (vote.status !== 'active') {
      return NextResponse.json({ error: '投票已结束' }, { status: 400 });
    }
    
    // 获取候选人信息
    const { data: candidate } = await client
      .from('vote_options')
      .select('id, title, sms_content, vote_count')
      .eq('id', candidate_id)
      .eq('vote_id', id)
      .maybeSingle();
    
    if (!candidate) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }
    
    // 检查是否已投票（同一投票同一设备只能投一次，或同一手机号只能投一次）
    let existingQuery = client
      .from('vote_records')
      .select('id, phone_number, device_id')
      .eq('vote_id', id);
    
    // 如果有设备ID，检查设备是否已投票
    if (device_id) {
      existingQuery = existingQuery.eq('device_id', device_id);
    } else {
      // 如果没有设备ID，检查手机号
      existingQuery = existingQuery.eq('phone_number', phone_number);
    }
    
    const { data: existingVote } = await existingQuery.maybeSingle();
    
    if (existingVote) {
      return NextResponse.json({ error: '您已经参与过投票，每人只能投票一次' }, { status: 400 });
    }
    
    // 获取代理ID
    let agentId = null;
    if (link_code) {
      const { data: link } = await client
        .from('agent_links')
        .select('id, agent_id, vote_count')
        .eq('link_code', link_code)
        .maybeSingle();
      
      if (link) {
        agentId = link.agent_id;
        
        // 更新链接投票数
        await client
          .from('agent_links')
          .update({ vote_count: (link.vote_count || 0) + 1 })
          .eq('id', link.id);
      }
    }
    
    // 获取客户端IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : null;
    
    // 创建投票记录
    const { error: recordError } = await client
      .from('vote_records')
      .insert({
        vote_id: id,
        option_id: candidate_id, // 兼容旧字段
        candidate_id: candidate_id,
        phone_number: phone_number,
        device_id: device_id || null,
        agent_id: agentId,
        source_link: link_code,
        voter_ip: ip,
        ip_address: ip,
      });
    
    if (recordError) {
      console.error('创建投票记录失败:', recordError);
      return NextResponse.json({ error: '投票失败' }, { status: 500 });
    }
    
    // 更新候选人票数
    await client
      .from('vote_options')
      .update({ vote_count: (candidate.vote_count || 0) + 1 })
      .eq('id', candidate_id);
    
    // 返回短信信息
    return NextResponse.json({
      success: true,
      sms_info: {
        number: vote.sms_number || '106988881700511',
        content: candidate.sms_content || candidate.title,
      },
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
