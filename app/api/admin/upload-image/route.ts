import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    // Get presigned URL for upload
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      file.name,
      file.type,
      true // public images
    );

    // Convert file to ArrayBuffer and upload to S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: buffer,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('S3 upload error:', errorText);
      return NextResponse.json(
        { error: 'Erro ao fazer upload para o servidor' },
        { status: 500 }
      );
    }

    // Get the public URL
    const imageUrl = await getFileUrl(cloud_storage_path, true);

    return NextResponse.json({
      success: true,
      url: imageUrl,
      cloud_storage_path,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar upload' },
      { status: 500 }
    );
  }
}
