import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const url = request.nextUrl.searchParams.get('url');

    // Mode 1: Fetch image from database by ID
    if (id) {
      const sql = getDb();
      const rows = await sql`
        SELECT data, content_type FROM uploaded_images WHERE id = ${id}
      `;

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: '图片不存在' }, { status: 404 });
      }

      const row = rows[0];
      const buffer = Buffer.from(row.data as string, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': row.content_type as string,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // Mode 2: Proxy external image by URL
    if (url) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        return NextResponse.json({ error: '无法获取图片' }, { status: response.status });
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await response.arrayBuffer());

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return NextResponse.json({ error: '缺少图片ID或URL' }, { status: 400 });
  } catch (error) {
    console.error('[proxy-image] Error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
