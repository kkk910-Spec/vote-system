import { sql } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function initUsers() {
  // 检查是否已存在用户
  const existing = await sql`SELECT id FROM users LIMIT 1`;
  
  if (existing.length > 0) {
    console.log('用户已存在，跳过初始化');
    return;
  }
  
  // 创建管理员账号
  const adminPassword = await hashPassword('admin123');
  await sql`INSERT INTO users (username, password, role, name) VALUES ('admin', ${adminPassword}, 'admin', '管理员')`;
  console.log('管理员账号创建成功: admin / admin123');
  
  // 创建代理账号
  const agentPassword = await hashPassword('123456');
  await sql`INSERT INTO users (username, password, role, name) VALUES ('agent001', ${agentPassword}, 'agent', '代理一号')`;
  console.log('代理账号创建成功: agent001 / 123456');
}

initUsers().catch(console.error);
