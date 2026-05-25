import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, is_active, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, role } = body;
    const { hashPassword } = await import('@/lib/auth');
    const hashedPassword = hashPassword(password);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hashedPassword,
        role: role || 'agent',
        is_active: true,
        login_fail_count: 0,
      })
      .select('id, username, role, is_active, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
