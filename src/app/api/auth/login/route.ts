import { NextResponse } from 'next/server';
import { getDb, hashPassword } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const db = getDb();

    // 查询用户
    const users = await db`
      SELECT id, username, password, role, is_active, name, login_fail_count, locked_until
      FROM users
      WHERE username = ${username}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const user = users[0] as any;

    // 检查账号是否被锁定
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        { error: '账号已被锁定，请稍后再试', locked: true, remainingMinutes },
        { status: 403 }
      );
    }

    // 验证密码
    const hashedPassword = await hashPassword(password);
    if (user.password !== hashedPassword) {
      // 更新失败次数
      const newFailCount = (user.login_fail_count || 0) + 1;
      const lockUntil = newFailCount >= 5
        ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
        : null;

      await db`
        UPDATE users
        SET login_fail_count = ${newFailCount}, locked_until = ${lockUntil}
        WHERE id = ${user.id}
      `;

      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 检查账号是否启用
    if (!user.is_active) {
      return NextResponse.json(
        { error: '账号已被禁用' },
        { status: 403 }
      );
    }

    // 更新登录时间和重置失败次数
    await db`
      UPDATE users
      SET last_login_at = NOW(),
          login_fail_count = 0,
          locked_until = NULL
      WHERE id = ${user.id}
    `;

    // 返回用户信息（不含密码），并设置 cookie
    const { password: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        login_fail_count: 0,
        locked_until: null,
      },
    });

    // 设置 user_id cookie，7天过期
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    console.error('Login error stack:', error?.stack);
    return NextResponse.json(
      { error: '登录失败', detail: error?.message || '未知错误' },
      { status: 500 }
    );
  }
}
