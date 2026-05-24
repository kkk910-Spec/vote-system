import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'agent';
  name: string | null;
}

export async function hashPassword(password: string): Promise<string> {
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
  
  try {
    const db = getDb();
    const users = await db`
      SELECT id, username, role, name FROM users 
      WHERE id = ${userId} AND is_active = true
      LIMIT 1
    `;
    
    if (users.length === 0) {
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
