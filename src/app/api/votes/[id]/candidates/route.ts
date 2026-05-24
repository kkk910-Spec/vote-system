import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// 获取候选人列表 / 添加候选人
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();
    
    const { data: candidates, error } = await client
      .from('vote_options')
      .select('id, title, description, image_url, sms_content, vote_count, order_num')
      .eq('vote_id', id)
      .order('order_num', { ascending: true });
    
    if (error) {
      console.error('获取候选人失败:', error);
      return NextResponse.json({ error: '获取候选人失败' }, { status: 500 });
    }
    
    // 格式化数据
    const formatted = (candidates || []).map(c => ({
      id: c.id,
      name: c.title,
      description: c.description,
      image_url: c.image_url,
      sms_content: c.sms_content || c.title,
      vote_count: c.vote_count || 0,
      order_num: c.order_num || 0,
    }));
    
    return NextResponse.json({ candidates: formatted });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 添加候选人
export async function POST(
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
    const { name, description, image_url, sms_content, order_num } = body;
    
    if (!name) {
      return NextResponse.json({ error: '请输入候选人姓名' }, { status: 400 });
    }
    
    // 获取当前最大排序号
    const { data: existing } = await client
      .from('vote_options')
      .select('order_num')
      .eq('vote_id', id)
      .order('order_num', { ascending: false })
      .limit(1);
    
    const nextOrder = order_num ?? ((existing?.[0]?.order_num || 0) + 1);
    
    const { data: candidate, error } = await client
      .from('vote_options')
      .insert({
        vote_id: id,
        title: name,
        description: description || null,
        image_url: image_url || null,
        sms_content: sms_content || name,
        order_num: nextOrder,
        vote_count: 0,
      })
      .select()
      .single();
    
    if (error) {
      console.error('添加候选人失败:', error);
      return NextResponse.json({ error: '添加候选人失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      candidate: {
        id: candidate.id,
        name: candidate.title,
        description: candidate.description,
        image_url: candidate.image_url,
        sms_content: candidate.sms_content,
        vote_count: candidate.vote_count || 0,
        order_num: candidate.order_num || 0,
      },
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
