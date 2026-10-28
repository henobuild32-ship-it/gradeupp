import nodemailer from 'nodemailer'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

let transporter: any = null

function getTransporter() {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 12000,
  })
  return transporter
}

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    console.warn(`[OTP] Adresse email invalide: ${email}`)
    return false
  }

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('[OTP] SMTP not configured')
    return false
  }
  try {
    const t = getTransporter()
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_EMAIL
    const fromName = process.env.SMTP_FROM_NAME || 'TRAIT'
    const textBody = [
      'TRAIT',
      '',
      'Code de vérification',
      `Votre code: ${otp}`,
      'Ce code expire dans 5 minutes.',
    ].join('\n')
    const info = await t.sendMail({
      from: `${fromName} <${fromAddress}>`,
      replyTo: process.env.SMTP_EMAIL,
      to: normalizedEmail,
      subject: 'Votre code de vérification TRAIT',
      text: textBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background: #0D5C63; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">T</div>
            <h1 style="color: #0D5C63; font-size: 20px; margin-top: 8px;">TRAIT</h1>
          </div>
          <h2 style="color: #1f2937; font-size: 18px; text-align: center;">Code de vérification</h2>
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">Utilisez le code ci-dessous pour vérifier votre identité</p>
          <div style="background: white; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #e5e7eb;">
            <h1 style="font-size: 42px; letter-spacing: 12px; color: #0D5C63; font-family: monospace; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Ce code expire dans 5 minutes. Si vous n'avez pas demandé ce code, ignorez cet email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">&copy; 2026 Trait Fintech</p>
        </div>
      `,
    })
    console.log('[OTP] Email sent')
    return true
  } catch (err) {
    console.error(`[OTP] Email failed for ${normalizedEmail}:`, err)
    return false
  }
}

export async function sendPasswordResetNoticeEmail(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    console.warn(`[OTP] Adresse email invalide pour réinitialisation: ${email}`)
    return false
  }

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('[Reset] SMTP not configured')
    return false
  }
  try {
    const t = getTransporter()
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_EMAIL
    const fromName = process.env.SMTP_FROM_NAME || 'TRAIT'
    await t.sendMail({
      from: `${fromName} <${fromAddress}>`,
      replyTo: process.env.SMTP_EMAIL,
      to: normalizedEmail,
      subject: 'Information de sécurité Trait Fintech',
      text: [
        'Trait Fintech',
        '',
        'Le mot de passe de votre compte a été réinitialisé par un administrateur Trait Fintech.',
        'Si vous n’êtes pas à l’origine de cette demande, contactez le support officiel ou utilisez la procédure de récupération de compte.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background: #0D5C63; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">T</div>
            <h1 style="color: #0D5C63; font-size: 20px; margin-top: 8px;">TRAIT</h1>
          </div>
          <h2 style="color: #1f2937; font-size: 18px; text-align: center;">Information de sécurité</h2>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">Le mot de passe de votre compte a été réinitialisé par un administrateur Trait Fintech. Si vous n’êtes pas à l’origine de cette demande, contactez le support officiel ou utilisez la procédure de récupération du compte.</p>
          <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 13px; text-align: center;">Trait Fintech ne transmet jamais un mot de passe par e-mail.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">&copy; 2026 Trait Fintech</p>
        </div>
      `,
    })
    return true
  } catch (err) {
    console.error(`[OTP] Password reset email failed for ${email}:`, err)
    return false
  }
}

function agentCredentialsHtml(agentName: string, agentCode: string, phone: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background: #0D5C63; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">T</div>
        <h1 style="color: #0D5C63; font-size: 20px; margin-top: 8px;">TRAIT</h1>
      </div>
      <h2 style="color: #1f2937; font-size: 18px; text-align: center;">Bienvenue en tant qu'agent TRAIT</h2>
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">Bonjour ${agentName}, votre compte agent a été validé par l'administrateur.</p>
      <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 13px; margin-bottom: 12px;">Votre code agent :</p>
        <p style="font-size: 28px; text-align: center; font-family: monospace; color: #0D5C63; font-weight: bold; margin: 8px 0; letter-spacing: 4px;">${agentCode}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="color: #374151; font-size: 13px; margin-bottom: 4px;">Identifiants de connexion :</p>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0;"><strong>Téléphone :</strong> ${phone}</p>
        <p style="color: #6b7280; font-size: 13px; margin: 4px 0;"><strong>Mot de passe :</strong> celui choisi lors de votre inscription</p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">Connectez-vous directement sur l'application TRAIT avec votre numéro et votre mot de passe d'inscription.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">&copy; 2026 Trait Fintech</p>
    </div>
  `
}

export async function sendAgentCredentialsEmail(
  email: string,
  agentName: string,
  agentCode: string,
  phone: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    console.warn(`[Agent] Adresse email invalide: ${email}`)
    return false
  }

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('[Agent] SMTP not configured')
    return false
  }
  try {
    const t = getTransporter()
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_EMAIL
    const fromName = process.env.SMTP_FROM_NAME || 'TRAIT'
    await t.sendMail({
      from: `${fromName} <${fromAddress}>`,
      replyTo: process.env.SMTP_EMAIL,
      to: normalizedEmail,
      subject: 'Votre compte agent TRAIT est validé',
      text: [
        'TRAIT',
        '',
        'Bienvenue en tant qu\'agent TRAIT !',
        '',
        `Bonjour ${agentName},`,
        '',
        'Votre compte agent a été validé par l\'administrateur.',
        '',
        `Code Agent: ${agentCode}`,
        `Téléphone: ${phone}`,
        'Mot de passe: celui choisi lors de votre inscription',
        '',
        'Connectez-vous directement sur l\'application TRAIT avec votre numéro et votre mot de passe d\'inscription.',
      ].join('\n'),
      html: agentCredentialsHtml(agentName, agentCode, phone),
    })
    console.log(`[Agent] Email identifiants envoyé à ${normalizedEmail}`)
    return true
  } catch (err) {
    console.error(`[Agent] Email failed for ${normalizedEmail}:`, err)
    return false
  }
}

export async function sendDeveloperApiKeysEmail(
  email: string,
  developerName: string,
  appName: string,
  publicKey: string,
  secretKey: string,
  webhookUrl?: string | null,
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail) || !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return false

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] || char)
  const safeName = escapeHtml(developerName)
  const safeAppName = escapeHtml(appName)
  const safePublicKey = escapeHtml(publicKey)
  const safeSecretKey = escapeHtml(secretKey)
  const safeWebhook = webhookUrl ? escapeHtml(webhookUrl) : ''

  try {
    const t = getTransporter()
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_EMAIL
    const fromName = process.env.SMTP_FROM_NAME || 'TRAIT'
    await t.sendMail({
      from: `${fromName} <${fromAddress}>`,
      replyTo: process.env.SMTP_EMAIL,
      to: normalizedEmail,
      subject: 'Vos clés API TRAIT',
      text: [
        `Bonjour ${developerName},`,
        '',
        `Voici les clés API de production pour ${appName}.`,
        `Clé publique : ${publicKey}`,
        `Clé secrète : ${secretKey}`,
        webhookUrl ? `Webhook : ${webhookUrl}` : '',
        '',
        'Conservez la clé secrète dans un gestionnaire de secrets et ne la partagez jamais.',
      ].filter(Boolean).join('\n'),
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#1f2937"><h1 style="color:#0D5C63">TRAIT API</h1><p>Bonjour ${safeName},</p><p>Voici les clés de production pour <strong>${safeAppName}</strong>.</p><p>Clé publique</p><pre>${safePublicKey}</pre><p>Clé secrète</p><pre>${safeSecretKey}</pre>${safeWebhook ? `<p>Webhook : ${safeWebhook}</p>` : ''}<p>Conservez la clé secrète dans un gestionnaire de secrets et ne la partagez jamais.</p></div>`,
    })
    return true
  } catch {
    console.error('[Developer API] Email delivery failed')
    return false
  }
}
