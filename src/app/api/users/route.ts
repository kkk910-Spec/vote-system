import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, getCurrentUser } from '@/lib/auth';

// 获取用户列表
export async function GET() {
  try {
    console.log('[获取用户列表] 开始处理请求');
    const user = await getCurrentUser();
    console.log('[获取用户列表] 当前用户:', user?.username, '角色:', user?.role);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('id, username, role, name, phone, is_active, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[获取用户列表] 数据库错误:', error);
      return NextResponse.json({ error: '获取用户列表失败: ' + error.message }, { status: 500 });
    }
    
    console.log('[获取用户列表] 成功，数量:', data?.length);
    return NextResponse.json({ users: data });
  } catch (err) {
    console.error('[获取用户列表] 异常:', err);
    return NextResponse.json({ error: '服务器错误: ' + String(err) }, { status: 500 });
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  try {
    console.log('[创建用户] 开始处理请求');
    const user = await getCurrentUser();
    console.log('[创建用户] 当前用户:', user?.username, '角色:', user?.role);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    const body = await request.json();
    const { username, password, role, name, phone } = body;
    console.log('[创建用户] 请求数据:', { username, role, name, phone });
    
    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }
    
    if (!['admin', 'agent'].includes(role)) {
      return NextResponse.json({ error: '角色类型无效' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    console.log('[创建用户] 开始哈希密码');
    const hashedPassword = await hashPassword(password);
    console.log('[创建用户] 密码哈希完成');
    
    const insertData = {
      username,
      password: hashedPassword,
      role,
      name: name || null,
      phone: phone || null,
    };
    console.log('[创建用户] 准备插入数据:', { ...insertData, password: '***' });
    
    const { error } = await client
      .from('users')
      .insert(insertData);
    
    if (error) {
      console.error('[创建用户] 数据库错误:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
      }
      return NextResponse.json({ error: '创建用户失败: ' + error.message }, { status: 500 });
    }
    
    console.log('[创建用户] 创建成功');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[创建用户] 异常:', err);
    return NextResponse.json({ error: '服务器错误: ' + String(err) }, { status: 500 });
  }
}
