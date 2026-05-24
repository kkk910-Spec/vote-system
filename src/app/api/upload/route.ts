import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 });
    }

    // 限制文件大小为 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');
    const contentType = file.type || 'image/png';
    const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const sql = getDb();
    await sql`INSERT INTO uploaded_images (id, data, content_type) VALUES (${id}, ${base64Data}, ${contentType})`;

    // 返回图片访问 URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.COZE_PROJECT_DOMAIN_DEFAULT
        ? `https://${process.env.COZE_PROJECT_DOMAIN_DEFAULT}`
        : `http://localhost:${process.env.PORT || 5000}`;

    const url = `${baseUrl}/api/proxy-image?id=${id}`;

    return NextResponse.json({ url, id });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
