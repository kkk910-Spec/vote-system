import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// 更新候选人
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const client = getSupabaseClient();
    
    // 获取候选人所属投票
    const { data: candidate } = await client
      .from('vote_options')
      .select('id, vote_id, votes(created_by)')
      .eq('id', candidateId)
      .maybeSingle();
    
    if (!candidate) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }
    
    const voteData = candidate.votes as { created_by?: string } | { created_by?: string }[] | null;
    const createdBy = Array.isArray(voteData) ? voteData[0]?.created_by : voteData?.created_by;
    if (user.role !== 'admin' && createdBy !== user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, description, image_url, sms_content, order_num, vote_count } = body;
    
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.title = name;
    if (description !== undefined) updateData.description = description;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (sms_content !== undefined) updateData.sms_content = sms_content;
    if (order_num !== undefined) updateData.order_num = order_num;
    if (vote_count !== undefined) updateData.vote_count = vote_count;
    
    const { data: updated, error } = await client
      .from('vote_options')
      .update(updateData)
      .eq('id', candidateId)
      .select()
      .single();
    
    if (error) {
      console.error('更新候选人失败:', error);
      return NextResponse.json({ error: '更新候选人失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      candidate: {
        id: updated.id,
        name: updated.title,
        description: updated.description,
        image_url: updated.image_url,
        sms_content: updated.sms_content,
        vote_count: updated.vote_count || 0,
        order_num: updated.order_num || 0,
      },
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除候选人
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const client = getSupabaseClient();
    
    // 获取候选人所属投票
    const { data: candidate } = await client
      .from('vote_options')
      .select('id, vote_id, votes(created_by)')
      .eq('id', candidateId)
      .maybeSingle();
    
    if (!candidate) {
      return NextResponse.json({ error: '候选人不存在' }, { status: 404 });
    }
    
    const voteData = candidate.votes as { created_by?: string } | { created_by?: string }[] | null;
    const createdBy = Array.isArray(voteData) ? voteData[0]?.created_by : voteData?.created_by;
    if (user.role !== 'admin' && createdBy !== user.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    
    const { error } = await client
      .from('vote_options')
      .delete()
      .eq('id', candidateId);
    
    if (error) {
      console.error('删除候选人失败:', error);
      return NextResponse.json({ error: '删除候选人失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
