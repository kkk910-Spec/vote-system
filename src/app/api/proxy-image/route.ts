import { NextRequest, NextResponse } from 'next/server';

// 内存缓存，避免重复请求相同图片
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1小时

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: '缺少图片URL' }, { status: 400 });
  }

  // 检查缓存
  const cached = imageCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.buffer, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: '获取图片失败' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const imageBuffer = await response.arrayBuffer();

    // 存入缓存（限制缓存大小）
    if (imageCache.size < 50 && imageBuffer.byteLength < 5 * 1024 * 1024) {
      imageCache.set(url, { 
        buffer: imageBuffer, 
        contentType, 
        timestamp: Date.now() 
      });
    }

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch {
    return NextResponse.json({ error: '代理图片失败' }, { status: 500 });
  }
}
