import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const reportStatuses = ['new', 'reviewing', 'info_requested', 'pending', 'resolved', 'rejected', 'closed'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    // The local Prisma client can lag the checked-in schema while a dev server
    // holds its generated engine file open. Keep the boundary local to this
    // route; CI regenerates the typed client from schema.prisma.
    const reportsDb = db.userReport as any
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Math.min(100_000, Number(searchParams.get('page')) || 1))
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 30))
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')?.trim().slice(0, 120)
    const where: any = {}

    if (status && status !== 'all' && reportStatuses.includes(status as typeof reportStatuses[number])) where.status = status
    if (type && type !== 'all' && ['user', 'seller', 'product', 'order', 'offer', 'message'].includes(type)) where.targetType = type
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { targetId: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { reporter: { name: { contains: search, mode: 'insensitive' } } },
        { reporter: { phone: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [reports, total, byStatus] = await Promise.all([
      reportsDb.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: { select: { id: true, name: true, pseudo: true, phone: true, deletedAt: true } },
          reviewer: { select: { id: true, name: true, username: true } },
        },
      }),
      reportsDb.count({ where }),
      reportsDb.groupBy({ by: ['status'], _count: { _all: true } }),
    ])

    const idsByType = (targetType: string) => reports.filter((report) => report.targetType === targetType).map((report) => report.targetId)
    const [users, products, orders, offers, messages] = await Promise.all([
      db.user.findMany({ where: { id: { in: [...new Set([...idsByType('user'), ...idsByType('seller')])] }, deletedAt: null }, select: { id: true, name: true, pseudo: true, phone: true, role: true, suspended: true } }),
      db.marketplaceProduct.findMany({ where: { id: { in: idsByType('product') } }, select: { id: true, name: true, category: true, active: true, sellerId: true } }),
      db.order.findMany({ where: { id: { in: idsByType('order') } }, select: { id: true, status: true, paymentStatus: true, amount: true, currency: true, sellerId: true, buyerId: true, product: { select: { name: true } } } }),
      db.barterOffer.findMany({ where: { id: { in: idsByType('offer') } }, select: { id: true, title: true, status: true, offeredBy: true } }),
      db.barterMessage.findMany({ where: { id: { in: idsByType('message') } }, select: { id: true, content: true, senderId: true, chatId: true } }),
    ])
    const targets = new Map<string, unknown>()
    for (const target of [...users, ...products, ...orders, ...offers, ...messages]) targets.set(target.id, target)

    return NextResponse.json({
      success: true,
      reports: reports.map((report) => ({
        ...report,
        reporter: report.reporter.deletedAt
          ? { id: report.reporter.id, name: null, pseudo: null, phone: null }
          : report.reporter,
        target: targets.get(report.targetId) ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts: Object.fromEntries(byStatus.map((entry) => [entry.status, entry._count._all])),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin reports load error:', error)
    return NextResponse.json({ success: false, message: 'Impossible de charger les signalements.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const reportsDb = db.userReport as any
    const body = await request.json().catch(() => ({}))
    const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : ''
    const status = typeof body.status === 'string' ? body.status : ''
    const note = typeof body.adminNote === 'string' ? body.adminNote.trim().slice(0, 2000) : ''
    if (!reportId || reportId.length > 128 || !reportStatuses.includes(status as typeof reportStatuses[number])) {
      return NextResponse.json({ success: false, message: 'Signalement ou statut invalide.' }, { status: 400 })
    }
    if (status === 'info_requested' && !note) {
      return NextResponse.json({ success: false, message: 'Ajoutez une note expliquant les informations demandées.' }, { status: 400 })
    }

    const before = await reportsDb.findUnique({ where: { id: reportId }, select: { id: true, status: true } })
    if (!before) return NextResponse.json({ success: false, message: 'Signalement introuvable.' }, { status: 404 })

    const [report] = await db.$transaction([
      reportsDb.update({
        where: { id: reportId },
        data: {
          status,
          adminNote: note || null,
          reviewedById: auth.userId,
          reviewedAt: status === 'new' ? null : new Date(),
        },
        include: {
          reporter: { select: { id: true, name: true, pseudo: true, phone: true, deletedAt: true } },
          reviewer: { select: { id: true, name: true, username: true } },
        },
      }),
      db.adminActivityLog.create({
        data: {
          adminId: auth.userId,
          action: 'report_status_updated',
          target: reportId,
          details: JSON.stringify({ from: before.status, to: status, note: note || undefined }),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        reporter: report.reporter.deletedAt
          ? { id: report.reporter.id, name: null, pseudo: null, phone: null }
          : report.reporter,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Admin reports update error:', error)
    return NextResponse.json({ success: false, message: 'Impossible de mettre à jour le signalement.' }, { status: 500 })
  }
}
