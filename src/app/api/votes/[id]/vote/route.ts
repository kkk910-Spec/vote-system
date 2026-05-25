import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await request.json();
    const { option_id, voter_name, voter_phone } = body;

    if (!option_id) {
      return NextResponse.json({ error: '请选择投票选项' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 检查投票是否存在且进行中
    const { data: vote } = await supabase
      .from('votes')
      .select('status')
      .eq('id', id)
      .single();

    if (!vote) {
      return NextResponse.json({ error: '投票不存在' }, { status: 404 });
    }
    if (vote.status !== 'active') {
      return NextResponse.json({ error: '投票已结束' }, { status: 400 });
    }

    // 检查是否已投票（同一用户/同一投票）
    if (user) {
      const { data: existing } = await supabase
        .from('vote_records')
        .select('id')
        .eq('vote_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: '您已经投过票了' }, { status: 400 });
      }
    }

    // 记录投票
    const { error: recordError } = await supabase
      .from('vote_records')
      .insert({
        vote_id: id,
        option_id,
        user_id: user?.id || null,
        voter_name: voter_name || null,
        voter_phone: voter_phone || null,
      });

    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 });
    }

    // 更新选项票数
    const { data: option } = await supabase
      .from('vote_options')
      .select('vote_count')
      .eq('id', option_id)
      .single();

    if (option) {
      await supabase
        .from('vote_options')
        .update({ vote_count: (option.vote_count || 0) + 1 })
        .eq('id', option_id);
    }

    // 更新投票总票数
    const { data: voteData } = await supabase
      .from('votes')
      .select('total_votes')
      .eq('id', id)
      .single();

    if (voteData) {
      await supabase
        .from('votes')
        .update({ total_votes: (voteData.total_votes || 0) + 1 })
        .eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
