import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: '缺少图片ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('uploaded_images')
      .select('image_data, content_type')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '图片不存在' }, { status: 404 });
    }

    const buffer = Buffer.from(data.image_data, 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': data.content_type,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
