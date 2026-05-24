import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少图片ID' }, { status: 400 });
    }

    const sql = getDb();
    const rows = await sql`SELECT data, content_type FROM uploaded_images WHERE id = ${id}`;

    if (rows.length === 0) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    const row = rows[0];
    const buffer = Buffer.from(row.data as string, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': row.content_type as string || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return NextResponse.json({ error: '获取图片失败' }, { status: 500 });
  }
}
