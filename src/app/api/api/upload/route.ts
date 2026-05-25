import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_data, file_name, content_type } = body;

    if (!image_data || !content_type) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const sql = getDb();
    const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await sql`
      INSERT INTO uploaded_images (id, data, content_type)
      VALUES (${id}, ${image_data}, ${content_type})
    `;

    return NextResponse.json({ id, url: `/api/proxy-image?id=${id}` });
  } catch {
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
