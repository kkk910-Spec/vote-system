import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createHash } from 'crypto';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'agent';
  name: string | null;
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = hashPassword(password);
  return hash === hashedPassword;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  
  if (!userId) {
    return null;
  }
  
  try {
    const supabase = getSupabaseAdmin();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, name')
      .eq('id', userId)
      .eq('is_active', true)
      .limit(1);

    if (error || !users || users.length === 0) {
      return null;
    }
    
    const data = users[0];
    return {
      id: data.id,
      username: data.username,
      role: data.role as 'admin' | 'agent',
      name: data.name,
    };
  } catch {
    return null;
  }
}
