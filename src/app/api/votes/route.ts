import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// 获取投票列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const user = await getCurrentUser();
    
    const client = getSupabaseClient();
    let query = client
      .from('votes')
      .select('id, title, description, status, sms_number, cover_image, created_at, created_by, top_text, vote_text')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // 代理和普通用户只能看到进行中的投票
    // 管理员可以看到所有投票
    if (user && user.role !== 'admin') {
      query = query.eq('status', 'active');
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('获取投票列表失败:', error);
      return NextResponse.json({ error: '获取投票列表失败' }, { status: 500 });
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ votes: [] }, {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        },
      });
    }
    
    // 并行获取创建者信息和所有候选人
    const voteIds = data.map(v => v.id);
    const userIds = [...new Set(data.map(v => v.created_by).filter(Boolean))];
    
    const [usersResult, candidatesResult] = await Promise.all([
      userIds.length > 0 
        ? client.from('users').select('id, username, name').in('id', userIds)
        : Promise.resolve({ data: [] }),
      client
        .from('vote_options')
        .select('id, vote_id, title, description, image_url, sms_content, vote_count, order_num')
        .in('vote_id', voteIds)
        .order('order_num', { ascending: true })
    ]);
    
    const userMap = new Map((usersResult.data || []).map(u => [u.id, u]));
    const candidatesByVote = new Map<string, typeof candidatesResult.data>();
    
    // 按投票ID分组候选人
    (candidatesResult.data || []).forEach(c => {
      const list = candidatesByVote.get(c.vote_id) || [];
      list.push(c);
      candidatesByVote.set(c.vote_id, list);
    });
    
    // 组装结果
    const votesWithCandidates = data.map(vote => {
      const candidates = candidatesByVote.get(vote.id) || [];
      const creator = vote.created_by ? userMap.get(vote.created_by) : null;
      
      const formattedCandidates = candidates.map(c => ({
        id: c.id,
        name: c.title,
        description: c.description,
        image_url: c.image_url,
        sms_content: c.sms_content || c.title,
        vote_count: c.vote_count || 0,
        order_num: c.order_num || 0,
      }));
      
      return {
        ...vote,
        users: creator ? { id: creator.id, username: creator.username, name: creator.name } : null,
        candidates: formattedCandidates,
      };
    });
    
    return NextResponse.json({ votes: votesWithCandidates }, {
      headers: {
        'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
      },
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建投票
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const body = await request.json();
    const { title, description, sms_number, cover_image, status, top_text, vote_text } = body;
    
    if (!title) {
      return NextResponse.json({ error: '请输入投票标题' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 创建投票
    const { data: vote, error: voteError } = await client
      .from('votes')
      .insert({
        title,
        description: description || null,
        created_by: user.id,
        sms_number: sms_number || '106988881700511',
        cover_image: cover_image || null,
        status: status || 'active',
        top_text: top_text || null,
        vote_text: vote_text || '已有 {count} 人参与投票',
      })
      .select()
      .single();
    
    if (voteError || !vote) {
      console.error('创建投票失败:', voteError);
      return NextResponse.json({ error: '创建投票失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, vote });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
