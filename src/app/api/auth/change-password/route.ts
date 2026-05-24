import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value;
    
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    
    const body = await request.json();
    const { oldPassword, newPassword } = body;
    
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度至少6位' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    
    // 获取用户信息
    const { data: user, error: userError } = await client
      .from('users')
      .select('id, password')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    
    // 验证旧密码
    const hashedOldPassword = await hashPassword(oldPassword);
    
    if (user.password !== hashedOldPassword) {
      return NextResponse.json({ error: '原密码错误' }, { status: 400 });
    }
    
    // 更新密码
    const hashedNewPassword = await hashPassword(newPassword);
    
    const { error: updateError } = await client
      .from('users')
      .update({
        password: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
