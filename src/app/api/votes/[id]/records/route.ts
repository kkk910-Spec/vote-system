import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// 获取投票记录（手机号列表）
// 管理员：可查看所有记录
// 代理：只能查看自己推广链接带来的记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const client = getSupabaseClient();
    
    // 检查投票是否存在
    const { data: vote } = await client
      .from('votes')
      .select('id, created_by')
      .eq('id', id)
      .maybeSingle();
    
    if (!vote) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const candidateId = searchParams.get('candidate_id');
    
    // 构建查询
    let countQuery = client
      .from('vote_records')
      .select('*', { count: 'exact', head: true })
      .eq('vote_id', id);
    
    let dataQuery = client
      .from('vote_records')
      .select('id, phone_number, created_at, ip_address, candidate_id, agent_id, source_link')
      .eq('vote_id', id)
      .order('created_at', { ascending: false });
    
    // 代理只能看到自己的记录
    if (user.role === 'agent') {
      countQuery = countQuery.eq('agent_id', user.id);
      dataQuery = dataQuery.eq('agent_id', user.id);
    }
    
    // 候选人筛选
    if (candidateId) {
      countQuery = countQuery.eq('candidate_id', candidateId);
      dataQuery = dataQuery.eq('candidate_id', candidateId);
    }
    
    // 获取总数
    const { count } = await countQuery;
    
    // 分页
    const offset = (page - 1) * pageSize;
    dataQuery = dataQuery.range(offset, offset + pageSize - 1);
    
    const { data, error } = await dataQuery;
    
    if (error) {
      console.error('获取投票记录失败:', error);
      return NextResponse.json({ error: '获取投票记录失败' }, { status: 500 });
    }
    
    // 获取候选人名称
    const candidateIds = [...new Set((data || []).map(r => r.candidate_id).filter(Boolean))];
    const { data: candidates } = candidateIds.length > 0
      ? await client.from('vote_options').select('id, title').in('id', candidateIds)
      : { data: [] };
    
    const candidateMap = new Map((candidates || []).map(c => [c.id, c.title]));
    
    // 获取投票标题
    const { data: voteInfo } = await client
      .from('votes')
      .select('title')
      .eq('id', id)
      .maybeSingle();
    
    // 管理员可以查看代理信息
    let agentMap = new Map();
    if (user.role === 'admin') {
      const agentIds = [...new Set((data || []).map(r => r.agent_id).filter(Boolean))];
      if (agentIds.length > 0) {
        const { data: agents } = await client.from('users').select('id, username, name').in('id', agentIds);
        agentMap = new Map((agents || []).map(a => [a.id, a]));
      }
    }
    
    // 格式化数据
    const records = (data || []).map(r => {
      const agent = r.agent_id ? agentMap.get(r.agent_id) : null;
      return {
        id: r.id,
        phone_number: r.phone_number,
        created_at: r.created_at,
        ip_address: r.ip_address,
        candidate_id: r.candidate_id,
        source_link: r.source_link,
        vote_title: voteInfo?.title || '未知投票',
        candidate_name: candidateMap.get(r.candidate_id) || '未知',
        agent_name: agent ? agent.username : null,
      };
    });
    
    return NextResponse.json({ 
      records,
      total: count || 0,
      page,
      pageSize,
      isAdmin: user.role === 'admin',
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
