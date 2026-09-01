import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB raw (client compresses first)

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file || !type) {
      return NextResponse.json(
        { success: false, message: 'Fichier et type requis' },
        { status: 400 }
      );
    }

    if (!['document', 'selfie'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Type invalide' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Fichier trop volumineux. Maximum 4 MB.' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Type de fichier invalide. Utilisez JPG, PNG ou WebP.' },
        { status: 400 }
      );
    }

    // Convert to base64 data URL
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      filename: file.name,
    });
  } catch (error: any) {
    const msg = error?.message || ''
    if (msg.includes('too large') || msg.includes('Payload') || error?.statusCode === 413) {
      return NextResponse.json(
        { success: false, message: 'Image trop volumineuse. Réduisez la qualité ou la taille.' },
        { status: 413 }
      )
    }
    console.error('KYC upload error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}
