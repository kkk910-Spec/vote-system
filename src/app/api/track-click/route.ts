import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 记录推广链接点击
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { link_code } = body;
    
    if (!link_code) {
      return NextResponse.json({ success: false });
    }
    
    const client = getSupabaseClient();
    
    // 获取当前点击数
    const { data: link } = await client
      .from('agent_links')
      .select('click_count')
      .eq('link_code', link_code)
      .single();
    
    if (link) {
      // 递增点击数
      await client
        .from('agent_links')
        .update({ click_count: (link.click_count || 0) + 1 })
        .eq('link_code', link_code);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('记录点击失败:', error);
    return NextResponse.json({ success: false });
  }
}
