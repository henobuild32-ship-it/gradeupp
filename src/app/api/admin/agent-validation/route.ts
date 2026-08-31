import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, hashPassword } from '@/lib/auth'
import { sendAgentCredentialsEmail } from '@/lib/email/service'

function generateAgentCode(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const last6 = cleaned.slice(-6)
  return `AGT-${last6}`
}

function generateSystemPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 12; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pw
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const search = searchParams.get('search') || ''

    const validStatuses = ['pending', 'validated', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Statut invalide' },
        { status: 400 }
      )
    }

    const where: any = { role: 'agent', validationStatus: status }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
      ]
    }

    const agents = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phone: true,
        name: true,
        pseudo: true,
        email: true,
        gender: true,
        country: true,
        city: true,
        address: true,
        photoId: true,
        validationStatus: true,
        validationRejectReason: true,
        agentCode: true,
        agentNumber: true,
        systemPassword: true,
        systemPasswordSent: true,
        suspended: true,
        suspensionReason: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, agents })
  } catch (error) {
    console.error('Admin agent validation error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth
    const adminId = auth.userId

    const body = await request.json()
    const { action, agentId, userId, reason, rejectReason, sendEmail } = body

    const targetId = agentId || userId

    if (!targetId || !action) {
      return NextResponse.json(
        { success: false, message: 'Paramètres manquants ou invalides' },
        { status: 400 }
      )
    }

    const validActions = ['accept', 'reject', 'approve', 'suspend', 'resend_credentials']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Action non reconnue' },
        { status: 400 }
      )
    }

    const normalizedAction = action === 'approve' ? 'accept' : action

    if (normalizedAction === 'accept') {
      const agent = await db.user.findUnique({ where: { id: targetId } })
      if (!agent) {
        return NextResponse.json(
          { success: false, message: 'Agent non trouvé' },
          { status: 404 }
        )
      }

      let agentCode = generateAgentCode(agent.phone)
      let codeExists = await db.user.findUnique({ where: { agentCode } })
      while (codeExists) {
        agentCode = generateAgentCode(agent.phone) + '-' + Math.floor(Math.random() * 100)
        codeExists = await db.user.findUnique({ where: { agentCode } })
      }

      const systemPassword = generateSystemPassword()
      const hashedPassword = await hashPassword(systemPassword)
      const agentNumber = agentCode

      await db.user.update({
        where: { id: targetId },
        data: {
          validationStatus: 'validated',
          isVerified: true,
          hasCompletedOnboarding: true,
          agentCode,
          agentNumber,
          systemPassword,
          password: hashedPassword,
        },
      })

      let emailSent = false
      if (sendEmail !== false && agent.email) {
        emailSent = await sendAgentCredentialsEmail(
          agent.email,
          agent.name || 'Agent',
          agentCode,
          systemPassword
        )
        if (emailSent) {
          await db.user.update({
            where: { id: targetId },
            data: { systemPasswordSent: true },
          })
        }
      }

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'validate_agent',
          target: targetId,
          details: `Agent validé: ${agent.name || agent.phone} - Code: ${agentCode}${emailSent ? ' - Email envoyé' : ''}`,
        },
      })

      return NextResponse.json({
        success: true,
        agentCode,
        agentNumber,
        systemPassword,
        emailSent,
      })
    }

    if (normalizedAction === 'reject') {
      const agent = await db.user.findUnique({ where: { id: targetId } })
      if (!agent) {
        return NextResponse.json(
          { success: false, message: 'Agent non trouvé' },
          { status: 404 }
        )
      }

      const reasonText = reason || rejectReason || 'Non conforme'

      await db.user.update({
        where: { id: targetId },
        data: {
          validationStatus: 'rejected',
          validationRejectReason: reasonText,
        },
      })

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'reject_agent',
          target: targetId,
          details: `Agent rejeté: ${agent.name || agent.phone}. Motif: ${reasonText}`,
        },
      })

      return NextResponse.json({ success: true })
    }

    if (normalizedAction === 'suspend') {
      const agent = await db.user.findUnique({ where: { id: targetId } })
      if (!agent) {
        return NextResponse.json(
          { success: false, message: 'Agent non trouvé' },
          { status: 404 }
        )
      }

      await db.user.update({
        where: { id: targetId },
        data: { suspended: true, suspensionReason: reason || 'Suspendu par admin' },
      })

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'suspend_agent',
          target: targetId,
          details: `Agent ${agent.name || agent.phone} suspendu`,
        },
      })

      return NextResponse.json({ success: true, message: 'Agent suspendu' })
    }

    if (normalizedAction === 'resend_credentials') {
      const agent = await db.user.findUnique({ where: { id: targetId } })
      if (!agent) {
        return NextResponse.json(
          { success: false, message: 'Agent non trouvé' },
          { status: 404 }
        )
      }

      if (!agent.email) {
        return NextResponse.json(
          { success: false, message: 'Email de l\'agent non disponible' },
          { status: 400 }
        )
      }

      if (!agent.systemPassword) {
        return NextResponse.json(
          { success: false, message: 'Identifiants non encore générés. Validez d\'abord l\'agent.' },
          { status: 400 }
        )
      }

      const emailSent = await sendAgentCredentialsEmail(
        agent.email,
        agent.name || 'Agent',
        agent.agentCode || '',
        agent.systemPassword
      )

      if (emailSent) {
        await db.user.update({
          where: { id: targetId },
          data: { systemPasswordSent: true },
        })
      }

      await db.adminActivityLog.create({
        data: {
          adminId,
          action: 'resend_credentials',
          target: targetId,
          details: `Identifiants renvoyés à ${agent.email}`,
        },
      })

      return NextResponse.json({ success: true, emailSent })
    }

    return NextResponse.json(
      { success: false, message: 'Action non reconnue' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Admin agent validation action error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
