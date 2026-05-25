import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: votes, error } = await supabase
      .from('votes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 获取所有选项
    const { data: options, error: optError } = await supabase
      .from('vote_options')
      .select('*');

    if (optError) {
      return NextResponse.json({ error: optError.message }, { status: 500 });
    }

    // 合并选项到投票
    const votesWithOptions = (votes || []).map((vote: Record<string, unknown>) => ({
      ...vote,
      options: (options || []).filter((opt: Record<string, unknown>) => opt.vote_id === vote.id),
    }));

    return NextResponse.json({ data: votesWithOptions });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'agent') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, start_time, end_time, is_public, options, status } = body;

    if (!title) {
      return NextResponse.json({ error: '请填写投票标题' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 创建投票
    const { data: vote, error } = await supabase
      .from('votes')
      .insert({
        title,
        description: description || '',
        start_time: start_time || null,
        end_time: end_time || null,
        is_public: is_public !== false,
        status: status || 'active',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 创建选项
    if (options && options.length > 0) {
      const optionRecords = options.map((opt: string | Record<string, unknown>) => {
        if (typeof opt === 'string') {
          return { vote_id: vote.id, title: opt };
        }
        return { 
          vote_id: vote.id, 
          title: (opt as Record<string, unknown>).title || (opt as Record<string, unknown>).name || '',
          description: (opt as Record<string, unknown>).description || '',
          image_url: (opt as Record<string, unknown>).image_url || '',
        };
      });

      const { error: optError } = await supabase
        .from('vote_options')
        .insert(optionRecords);

      if (optError) {
        return NextResponse.json({ error: optError.message }, { status: 500 });
      }
    }

    // 重新获取带选项的投票
    const { data: fullVote } = await supabase
      .from('votes')
      .select('*')
      .eq('id', vote.id)
      .single();

    const { data: voteOptions } = await supabase
      .from('vote_options')
      .select('*')
      .eq('vote_id', vote.id);

    return NextResponse.json({ data: { ...fullVote, options: voteOptions || [] } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
