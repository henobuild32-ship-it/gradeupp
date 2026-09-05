import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireUser } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_SIZE = 3 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: 'Type de fichier invalide' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, message: 'Fichier trop volumineux (max 3 Mo)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `agent_${timestamp}_${randomStr}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'agent-photos');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const url = `/uploads/agent-photos/${filename}`;

    return NextResponse.json({ success: true, url, message: 'Photo téléchargée' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur lors du téléchargement' }, { status: 500 });
  }
}
