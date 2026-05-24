import { getSupabaseClient } from '../src/storage/database/supabase-client';
import { hashPassword } from '../src/lib/auth';

async function initUsers() {
  const client = getSupabaseClient();
  
  // 检查是否已存在用户
  const { data: existingUsers } = await client
    .from('users')
    .select('id')
    .limit(1);
  
  if (existingUsers && existingUsers.length > 0) {
    console.log('用户已存在，跳过初始化');
    return;
  }
  
  // 创建管理员账号
  const adminPassword = await hashPassword('admin123');
  const { error: adminError } = await client
    .from('users')
    .insert({
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      name: '管理员',
    });
  
  if (adminError) {
    console.error('创建管理员失败:', adminError);
  } else {
    console.log('管理员账号创建成功: admin / admin123');
  }
  
  // 创建代理账号
  const agentPassword = await hashPassword('123456');
  const { error: agentError } = await client
    .from('users')
    .insert({
      username: 'agent001',
      password: agentPassword,
      role: 'agent',
      name: '代理一号',
    });
  
  if (agentError) {
    console.error('创建代理失败:', agentError);
  } else {
    console.log('代理账号创建成功: agent001 / 123456');
  }
}

initUsers().catch(console.error);
