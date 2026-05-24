import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 图片上传接口
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型' }, { status: 400 });
    }

    // 限制文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过5MB' }, { status: 400 });
    }

    // 生成文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `vote-images/${timestamp}-${randomStr}.${ext}`;

    // 上传到 Supabase Storage
    const client = getSupabaseClient();
    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'vote-files';
    
    // 将 File 转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const { data, error } = await client.storage
      .from(bucketName)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('上传失败:', error);
      // 如果 bucket 不存在，返回一个临时方案
      return NextResponse.json({ 
        error: '存储配置错误，请联系管理员',
        details: error.message 
      }, { status: 500 });
    }

    // 获取公开 URL
    const { data: urlData } = client.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl,
      path: data.path 
    });
  } catch (error) {
    console.error('上传错误:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
