import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireUser } from '@/lib/auth';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'kyc');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'document' or 'selfie'

    if (!file || !type) {
      return NextResponse.json(
        { success: false, message: 'Fichier et type requis' },
        { status: 400 }
      );
    }

    if (!['document', 'selfie'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Type invalide. Utilisez "document" ou "selfie"' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Fichier trop volumineux. Maximum 5 MB.' },
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

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${auth.userId}_${type}_${timestamp}_${randomSuffix}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    await writeFile(filepath, buffer);

    const url = `/uploads/kyc/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error('KYC upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}
