import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// 获取投票详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const refCode = searchParams.get('ref');
    
    const client = getSupabaseClient();
    
    // 并行查询投票详情和候选人
    const [voteResult, candidatesResult] = await Promise.all([
      client
        .from('votes')
        .select('id, title, description, status, sms_number, cover_image, created_at, created_by, top_text, vote_text')
        .eq('id', id)
        .maybeSingle(),
      client
        .from('vote_options')
        .select('id, title, description, image_url, sms_content, vote_count, order_num')
        .eq('vote_id', id)
        .order('order_num', { ascending: true })
    ]);
    
    const vote = voteResult.data;
    if (voteResult.error || !vote) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    
    // 格式化候选人数据
    const formattedCandidates = (candidatesResult.data || []).map(c => ({
      id: c.id,
      name: c.title,
      description: c.description,
      image_url: c.image_url,
      sms_content: c.sms_content || c.title,
      vote_count: c.vote_count || 0,
      order_num: c.order_num || 0,
    }));
    
    // 并行获取代理信息和创建者信息
    const promises: Promise<void>[] = [];
    
    // 代理信息查询
    let agentInfo = null;
    if (refCode) {
      promises.push(
        (async () => {
          const { data: link } = await client
            .from('agent_links')
            .select('id, agent_id, click_count, users(id, username, name)')
            .eq('link_code', refCode)
            .maybeSingle();
          
          if (link) {
            agentInfo = {
              link_id: link.id,
              agent_id: link.agent_id,
              agent: link.users,
            };
            // 异步更新点击次数，不等待结果
            client
              .from('agent_links')
              .update({ click_count: ((link as { click_count?: number }).click_count || 0) + 1 })
              .eq('id', link.id);
          }
        })()
      );
    }
    
    // 创建者信息查询
    let creator = null;
    if (vote.created_by) {
      promises.push(
        (async () => {
          const { data } = await client
            .from('users')
            .select('id, username, name')
            .eq('id', vote.created_by)
            .maybeSingle();
          creator = data;
        })()
      );
    }
    
    // 并行执行所有查询
    await Promise.all(promises);
    
    // 返回响应，添加缓存控制
    return NextResponse.json({
      vote: {
        ...vote,
        users: creator,
        candidates: formattedCandidates,
      },
      agentInfo,
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 更新投票
export async function PUT(
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
    
    // 检查权限
    const { data: vote } = await client
      .from('votes')
      .select('created_by')
      .eq('id', id)
      .maybeSingle();
    
    if (!vote) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    
    if (user.role !== 'admin' && vote.created_by !== user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    
    const body = await request.json();
    const { title, description, sms_number, cover_image, status, top_text, vote_text } = body;
    
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (sms_number !== undefined) updateData.sms_number = sms_number;
    if (cover_image !== undefined) updateData.cover_image = cover_image;
    if (status !== undefined) updateData.status = status;
    if (top_text !== undefined) updateData.top_text = top_text;
    if (vote_text !== undefined) updateData.vote_text = vote_text;
    
    const { data: updatedVote, error } = await client
      .from('votes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('更新投票失败:', error);
      return NextResponse.json({ error: '更新投票失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, vote: updatedVote });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除投票
export async function DELETE(
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
    
    // 检查权限
    const { data: vote } = await client
      .from('votes')
      .select('created_by')
      .eq('id', id)
      .maybeSingle();
    
    if (!vote) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    
    if (user.role !== 'admin' && vote.created_by !== user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    
    // 删除候选人（会级联删除投票记录）
    await client.from('vote_options').delete().eq('vote_id', id);
    
    // 删除投票
    const { error } = await client.from('votes').delete().eq('id', id);
    
    if (error) {
      console.error('删除投票失败:', error);
      return NextResponse.json({ error: '删除投票失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
