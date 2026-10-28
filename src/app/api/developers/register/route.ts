import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getCountry, normalizePhoneForCountry } from '@/lib/countries';
import { z } from 'zod';

const DeveloperRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(24),
  country: z.string().regex(/^[A-Z]{2}$/),
  appName: z.string().trim().min(2).max(120),
  projectType: z.enum(['Android', 'iOS', 'Web', 'Flutter', 'React Native', 'Python', 'PHP', 'JavaScript']),
  description: z.string().trim().max(2000).optional(),
  siteUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  estimatedUsers: z.coerce.number().int().min(50).max(10_000_000),
});

// POST - Developer registration
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const limit = checkRateLimit({ windowMs: 60_000, maxRequests: 3, key: `developer-register:${ip}` });
    if (!limit.allowed) return rateLimitResponse(limit.resetIn);

    const body = await request.json();
    const parsed = DeveloperRegistrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message || 'Vérifiez les informations saisies.' }, { status: 400 });
    }
    const data = parsed.data;
    if (!getCountry(data.country)) {
      return NextResponse.json({ success: false, message: 'Pays invalide.' }, { status: 400 });
    }
    const canonicalPhone = normalizePhoneForCountry(data.phone, data.country);
    if (!canonicalPhone) {
      return NextResponse.json({ success: false, message: 'Le numéro ne correspond pas au pays sélectionné.' }, { status: 400 });
    }
    const fullName = data.fullName;
    const company = data.company || null;
    const email = data.email.toLowerCase();
    const phone = canonicalPhone;
    const { country, appName, projectType, description, siteUrl, estimatedUsers } = data;

    // Check email uniqueness
    const existingDeveloper = await db.developer.findUnique({
      where: { email },
    });

    if (existingDeveloper) {
      return NextResponse.json(
        { success: false, message: 'Cet email est déjà utilisé pour une inscription développeur' },
        { status: 409 }
      );
    }

    // Create developer record with status: pending
    const developer = await db.developer.create({
      data: {
        fullName,
        company: company || null,
        email,
        phone,
        country,
        appName,
        projectType,
        description: description || null,
        siteUrl: siteUrl || null,
        estimatedUsers,
        status: 'pending',
      },
    });

    // Create AdminActivityLog (optional, may fail if no system admin)
    try {
      await db.adminActivityLog.create({
        data: {
          adminId: 'system',
          action: 'developer_register',
          target: developer.id,
          details: `Nouvelle demande développeur: ${fullName} (${email}) - Application: ${appName} (${projectType})`,
        },
      });
    } catch { /* system admin not found, skip */ }

    // Create GlobalNotification for admin (optional)
    try {
      await db.globalNotification.create({
        data: {
          adminId: 'system',
          title: 'Nouvelle demande développeur',
          message: `${fullName} a soumis une demande de compte développeur pour l'application "${appName}" (${projectType}). Pays: ${country}. Email: ${email}`,
          type: 'alert',
          sentToAll: false,
        },
      });
    } catch { /* skip */ }

    return NextResponse.json({
      success: true,
      message: 'Demande de compte développeur soumise avec succès',
      developer: {
        id: developer.id,
        fullName: developer.fullName,
        email: developer.email,
        appName: developer.appName,
        status: developer.status,
      },
    });
  } catch (error) {
    console.error('Developer registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
