import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: vote, error } = await supabase
      .from('votes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !vote) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }

    const { data: options } = await supabase
      .from('vote_options')
      .select('*')
      .eq('vote_id', id);

    return NextResponse.json({ data: { ...vote, options: options || [] } });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.start_time !== undefined) updateData.start_time = body.start_time;
    if (body.end_time !== undefined) updateData.end_time = body.end_time;
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.status !== undefined) updateData.status = body.status;

    const { data: vote, error } = await supabase
      .from('votes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: vote });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // 删除选项
    await supabase.from('vote_options').delete().eq('vote_id', id);
    // 删除记录
    await supabase.from('vote_records').delete().eq('vote_id', id);
    // 删除投票
    const { error } = await supabase.from('votes').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
