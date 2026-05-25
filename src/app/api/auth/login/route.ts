import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 查询用户
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .limit(1);

    if (queryError) {
      console.error('查询用户失败:', queryError);
      return NextResponse.json({ error: '数据库查询失败' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const user = users[0];

    // 检查账户状态
    if (!user.is_active) {
      return NextResponse.json({ error: '账户已被禁用' }, { status: 403 });
    }

    // 检查锁定状态
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json({ error: '账户已锁定，请稍后重试' }, { status: 403 });
    }

    // 验证密码
    const passwordHash = hashPassword(password);
    if (passwordHash !== user.password) {
      // 更新失败计数
      const failCount = (user.login_fail_count || 0) + 1;
      const updates: Record<string, unknown> = { login_fail_count: failCount };
      if (failCount >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }
      await supabase.from('users').update(updates).eq('id', user.id);
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    // 登录成功 - 重置失败计数
    await supabase.from('users').update({
      login_fail_count: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    }).eq('id', user.id);

    // 设置 cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    response.cookies.set('user_role', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
