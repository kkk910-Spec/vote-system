import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_data, file_name, content_type } = body;

    if (!image_data || !content_type) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('uploaded_images')
      .insert({
        image_data,
        file_name: file_name || 'image',
        content_type,
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, url: `/api/proxy-image?id=${data.id}` });
  } catch {
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
