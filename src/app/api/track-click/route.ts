import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { link_code, ip_address, user_agent } = body;

    if (!link_code) {
      return NextResponse.json({ error: '缺少链接代码' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 查找 agent_link
    const { data: link, error: linkError } = await supabase
      .from('agent_links')
      .select('id, vote_id')
      .eq('link_code', link_code)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: '链接不存在' }, { status: 404 });
    }

    // 记录点击
    await supabase.from('click_tracks').insert({
      agent_link_id: link.id,
      vote_id: link.vote_id,
      ip_address: ip_address || null,
      user_agent: user_agent || null,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
