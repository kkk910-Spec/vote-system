import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/auth';

// 获取当前域名
function getDomain(request: NextRequest): string {
  // 优先使用环境变量中的域名
  const envDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT;
  if (envDomain) {
    return envDomain;
  }
  // 否则使用请求的 host
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  if (host) {
    return `${protocol}://${host}`;
  }
  return '';
}

// 获取代理链接列表
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const client = getSupabaseClient();
    
    let query = client
      .from('agent_links')
      .select('id, link_code, name, click_count, vote_count, created_at, vote_id')
      .order('created_at', { ascending: false });
    
    // 代理只能看到自己的链接
    if (user.role === 'agent') {
      query = query.eq('agent_id', user.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('获取代理链接失败:', error);
      return NextResponse.json({ error: '获取代理链接失败' }, { status: 500 });
    }
    
    // 手动获取投票信息
    const voteIds = [...new Set((data || []).map(l => l.vote_id).filter(Boolean))];
    const { data: votes } = voteIds.length > 0 
      ? await client.from('votes').select('id, title').in('id', voteIds)
      : { data: [] };
    
    const voteMap = new Map((votes || []).map(v => [v.id, v]));
    
    // 获取域名
    const domain = getDomain(request);
    
    const links = (data || []).map(link => ({
      ...link,
      votes: voteMap.get(link.vote_id) || null,
      full_url: `${domain}?ref=${link.link_code}`,
    }));
    
    return NextResponse.json({ links });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 创建代理链接
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    // 只有代理和管理员可以创建
    if (user.role !== 'agent' && user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }
    
    const body = await request.json();
    const { vote_id, name } = body;
    
    if (!vote_id) {
      return NextResponse.json({ error: '请选择投票项目' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 检查投票是否存在
    const { data: vote } = await client
      .from('votes')
      .select('id, title')
      .eq('id', vote_id)
      .single();
    
    if (!vote) {
      return NextResponse.json({ error: '投票项目不存在' }, { status: 400 });
    }
    
    // 生成唯一链接码
    const linkCode = generateLinkCode();
    
    const { data, error } = await client
      .from('agent_links')
      .insert({
        agent_id: user.id,
        vote_id,
        link_code: linkCode,
        name: name || `推广链接 ${(new Date()).toLocaleDateString('zh-CN')}`,
        click_count: 0,
        vote_count: 0,
      })
      .select()
      .single();
    
    if (error) {
      console.error('创建代理链接失败:', error);
      return NextResponse.json({ error: '创建代理链接失败: ' + error.message }, { status: 500 });
    }
    
    // 获取域名
    const domain = getDomain(request);
    
    return NextResponse.json({ 
      success: true, 
      link: {
        ...data,
        vote_title: vote.title,
        full_url: `${domain}?ref=${linkCode}`,
      },
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除代理链接
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '缺少链接ID' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 代理只能删除自己的链接
    let query = client.from('agent_links').delete().eq('id', id);
    if (user.role === 'agent') {
      query = query.eq('agent_id', user.id);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('删除代理链接失败:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 生成唯一链接码
function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
