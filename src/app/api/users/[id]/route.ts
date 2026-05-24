import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword, getCurrentUser } from '@/lib/auth';

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    const body = await request.json();
    const { username, password, role, name, phone, is_active } = body;
    
    const client = getSupabaseClient();
    const updateData: Record<string, unknown> = {};
    
    if (username !== undefined) updateData.username = username;
    if (password) updateData.password = await hashPassword(password);
    if (role !== undefined) updateData.role = role;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const { error } = await client
      .from('users')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }
    
    // 不能删除自己
    if (id === user.id) {
      return NextResponse.json({ error: '不能删除自己的账号' }, { status: 400 });
    }
    
    const client = getSupabaseClient();
    const { error } = await client
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
