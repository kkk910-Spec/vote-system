import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
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
    const sql = getDb();
    const users = await sql`
      SELECT id, username, role, name
      FROM users
      WHERE id = ${userId} AND is_active = true
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return null;
    }

    const data = users[0];
    return {
      id: data.id as string,
      username: data.username as string,
      role: data.role as 'admin' | 'agent',
      name: data.name as string | null,
    };
  } catch {
    return null;
  }
}
