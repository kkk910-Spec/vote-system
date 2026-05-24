import { cookies } from 'next/headers';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'agent';
  name: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  // 简单的密码哈希（生产环境应使用 bcrypt）
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  
  if (!userId) {
    return null;
  }
  
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('id, username, role, name')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    username: data.username,
    role: data.role as 'admin' | 'agent',
    name: data.name,
  };
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('未授权');
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('需要管理员权限');
  }
  return user;
}
