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
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">&copy; 2026 TRAIT - RDC</p>
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

export async function sendPasswordResetEmail(email: string, newPassword: string): Promise<boolean> {
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
      subject: 'Votre nouveau mot de passe TRAIT',
      text: [
        'TRAIT',
        '',
        'Réinitialisation de mot de passe',
        `Nouveau mot de passe: ${newPassword}`,
        'Veuillez le changer après votre connexion.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background: #0D5C63; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">T</div>
            <h1 style="color: #0D5C63; font-size: 20px; margin-top: 8px;">TRAIT</h1>
          </div>
          <h2 style="color: #1f2937; font-size: 18px; text-align: center;">R&eacute;initialisation de mot de passe</h2>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">Votre mot de passe a &eacute;t&eacute; r&eacute;initialis&eacute;.</p>
          <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 13px; margin-bottom: 8px;">Votre nouveau mot de passe :</p>
            <p style="font-size: 24px; text-align: center; font-family: monospace; color: #0D5C63; font-weight: bold; margin: 12px 0; letter-spacing: 2px;">${newPassword}</p>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">Veuillez changer ce mot de passe apr&egrave;s votre prochaine connexion.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">&copy; 2026 TRAIT - RDC</p>
        </div>
      `,
    })
    return true
  } catch (err) {
    console.error(`[OTP] Password reset email failed for ${email}:`, err)
    return false
  }
}

function agentCredentialsHtml(agentName: string, agentCode: string, systemPassword: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background: #0D5C63; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">T</div>
        <h1 style="color: #0D5C63; font-size: 20px; margin-top: 8px;">TRAIT</h1>
      </div>
      <h2 style="color: #1f2937; font-size: 18px; text-align: center;">Bienvenue en tant qu'agent TRAIT</h2>
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">Bonjour ${agentName}, votre compte agent a été validé. Voici vos identifiants de connexion :</p>
      <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 13px; margin-bottom: 12px;">Votre code agent :</p>
        <p style="font-size: 28px; text-align: center; font-family: monospace; color: #0D5C63; font-weight: bold; margin: 8px 0; letter-spacing: 4px;">${agentCode}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="color: #374151; font-size: 13px; margin-bottom: 8px;">Votre mot de passe système :</p>
        <p style="font-size: 24px; text-align: center; font-family: monospace; color: #0D5C63; font-weight: bold; margin: 12px 0; letter-spacing: 2px;">${systemPassword}</p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Connectez-vous avec ces identifiants sur l'application TRAIT.</p>
        <p style="color: #dc2626; font-size: 12px; text-align: center; font-weight: bold;">Changez votre mot de passe après la première connexion.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 11px; text-align: center;">&copy; 2026 TRAIT - RDC</p>
    </div>
  `
}

export async function sendAgentCredentialsEmail(
  email: string,
  agentName: string,
  agentCode: string,
  systemPassword: string
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
      subject: 'Vos identifiants agent TRAIT',
      text: [
        'TRAIT',
        '',
        'Bienvenue en tant qu\'agent TRAIT !',
        '',
        `Bonjour ${agentName},`,
        '',
        `Code Agent: ${agentCode}`,
        `Mot de passe système: ${systemPassword}`,
        '',
        'Connectez-vous avec ces identifiants sur l\'application TRAIT.',
        'Changez votre mot de passe après la première connexion.',
      ].join('\n'),
      html: agentCredentialsHtml(agentName, agentCode, systemPassword),
    })
    console.log(`[Agent] Email identifiants envoyé à ${normalizedEmail}`)
    return true
  } catch (err) {
    console.error(`[Agent] Email failed for ${normalizedEmail}:`, err)
    return false
  }
}
