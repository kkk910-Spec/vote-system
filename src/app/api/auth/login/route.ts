import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/auth';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 先查询用户基本信息
    const { data: userCheck, error: checkError } = await client
      .from('users')
      .select('id, username, role, name, is_active, password')
      .eq('username', username)
      .maybeSingle();
    
    if (checkError) {
      console.error('查询用户失败:', checkError);
      return NextResponse.json({ error: '登录失败' }, { status: 500 });
    }
    
    if (!userCheck) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }
    
    if (!userCheck.is_active) {
      return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });
    }
    
    // 尝试查询锁定信息（如果字段存在）
    let lockInfo = { login_fail_count: 0, locked_until: null as string | null };
    try {
      const { data: lockData } = await client
        .from('users')
        .select('login_fail_count, locked_until')
        .eq('id', userCheck.id)
        .single();
      
      if (lockData) {
        lockInfo = {
          login_fail_count: lockData.login_fail_count || 0,
          locked_until: lockData.locked_until
        };
      }
    } catch {
      // 字段不存在，忽略错误
    }
    
    // 检查是否被锁定
    if (lockInfo.locked_until) {
      const lockedUntil = new Date(lockInfo.locked_until);
      const now = new Date();
      
      if (lockedUntil > now) {
        const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000 / 60);
        return NextResponse.json({ 
          error: `账号已被锁定，请在 ${remainingMinutes} 分钟后重试`,
          locked: true,
          remainingMinutes
        }, { status: 403 });
      }
    }
    
    // 验证密码
    const hashedPassword = await hashPassword(password);
    
    if (userCheck.password !== hashedPassword) {
      // 密码错误，增加失败计数
      const newFailCount = lockInfo.login_fail_count + 1;
      
      // 尝试更新失败计数
      try {
        if (newFailCount >= MAX_LOGIN_ATTEMPTS) {
          // 达到最大尝试次数，锁定账号
          const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
          
          await client
            .from('users')
            .update({
              login_fail_count: newFailCount,
              locked_until: lockedUntil.toISOString()
            })
            .eq('id', userCheck.id);
          
          return NextResponse.json({ 
            error: `密码错误次数过多，账号已被锁定 ${LOCK_DURATION_MINUTES} 分钟`,
            locked: true,
            remainingMinutes: LOCK_DURATION_MINUTES
          }, { status: 403 });
        } else {
          // 更新失败计数
          await client
            .from('users')
            .update({ login_fail_count: newFailCount })
            .eq('id', userCheck.id);
        }
      } catch (updateError) {
        console.error('更新失败计数失败:', updateError);
        // 如果更新失败（字段不存在），继续正常流程
      }
      
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - newFailCount;
      return NextResponse.json({ 
        error: `用户名或密码错误，还剩 ${remainingAttempts} 次尝试机会`
      }, { status: 401 });
    }
    
    // 登录成功，重置失败计数和锁定时间
    try {
      await client
        .from('users')
        .update({
          login_fail_count: 0,
          locked_until: null
        })
        .eq('id', userCheck.id);
    } catch {
      // 字段不存在，忽略错误
    }
    
    const response = NextResponse.json({
      success: true,
      user: {
        id: userCheck.id,
        username: userCheck.username,
        role: userCheck.role,
        name: userCheck.name,
      },
    });
    
    // 设置 cookie
    response.cookies.set('user_id', userCheck.id, {
      httpOnly: true,
      secure: process.env.COZE_PROJECT_ENV === 'PROD',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return response;
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
