import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { MAX_KYC_IMAGE_BYTES, validateKycImageDataUrl } from '@/lib/kyc-image-validation';

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

    if (file.size > MAX_KYC_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, message: 'Fichier trop volumineux. Maximum 1,5 Mo.' },
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

    // Validate the actual file bytes; the browser-provided MIME type alone is not trusted.
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const validation = validateKycImageDataUrl(dataUrl);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: 'Le contenu du fichier ne correspond pas à son format.' }, { status: 400 });
    }

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
