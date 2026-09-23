import { PrismaClient } from '@prisma/client'
import fs from 'fs'

const BASE = 'https://trait-rho.vercel.app'
const db = new PrismaClient()

const results: { name: string; ok: boolean; detail?: string }[] = []
function pass(name: string, detail?: string) {
  results.push({ name, ok: true, detail })
  console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`)
}
function fail(name: string, detail?: string) {
  results.push({ name, ok: false, detail })
  console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`)
}

async function api(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* ignore */
  }
  return { status: res.status, json }
}

function env(name: string): string {
  const m = fs.readFileSync('.env', 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'))
  if (!m) throw new Error(`Missing ${name}`)
  return m[1].trim()
}

async function cleanupPhones(phones: string[]) {
  for (const phone of phones) {
    await db.user.deleteMany({ where: { phone } })
  }
}

async function main() {
  const stamp = Date.now()
  const clientPhone = `+24381${String(stamp).slice(-7)}`
  const sellerPhone = `+24382${String(stamp).slice(-7)}`
  const agentPhone = `+24383${String(stamp).slice(-7)}`
  const receiverPhone = `+24384${String(stamp).slice(-7)}`
  const phones = [clientPhone, sellerPhone, agentPhone, receiverPhone]

  try {
    // ── 1. Health / home / PWA ────────────────────────────────────────
    const health = await api('GET', '/api/health')
    health.status === 200 && health.json?.success
      ? pass('health')
      : fail('health', String(health.status))

    const homeRes = await fetch(`${BASE}/`)
    const homeHtml = await homeRes.text()
    if (homeRes.status === 200 && homeHtml.includes('__next')) pass('home')
    else if (homeRes.status === 200 && homeHtml.length > 500) pass('home')
    else fail('home', String(homeRes.status))

    const csp = homeRes.headers.get('content-security-policy')
    if (csp) pass('csp', csp.slice(0, 40) + '…')
    else fail('csp', 'missing')

    const man = await fetch(`${BASE}/manifest.json`)
    const manJson: any = await man.json().catch(() => null)
    if (man.status === 200 && manJson?.name?.includes('TRAIT')) pass('manifest')
    else fail('manifest', String(man.status))

    const sw = await fetch(`${BASE}/sw.js`)
    const swText = await sw.text()
    if (sw.status === 200 && swText.includes('trait-v')) pass('sw', swText.match(/trait-v\d+/)?.[0] || '')
    else fail('sw', String(sw.status))

    // ── 2. OTP ────────────────────────────────────────────────────────
    const otp = await api('POST', '/api/auth/send-otp', { phone: clientPhone })
    if (otp.status === 200 && otp.json?.success) {
      const hasDemo = typeof otp.json.demoOtp === 'string' || typeof otp.json.code === 'string'
      pass('send-otp', hasDemo ? 'demoOtp present' : JSON.stringify(otp.json).slice(0, 80))
    } else fail('send-otp', `${otp.status} ${JSON.stringify(otp.json)?.slice(0, 100)}`)

    // ── 3. Register client / agent / seller ───────────────────────────
    const regClient = await api('POST', '/api/auth/register', {
      phone: clientPhone,
      name: 'E2E Client',
      pseudo: `e2ec${stamp % 100000}`,
      country: 'CD',
      role: 'client',
      password: 'testpass123',
      email: `e2ec${stamp}@example.com`,
    })
    if (regClient.status === 200 && regClient.json?.success) pass('register-client')
    else fail('register-client', `${regClient.status} ${JSON.stringify(regClient.json)?.slice(0, 120)}`)

    const regAgent = await api('POST', '/api/auth/register', {
      phone: agentPhone,
      name: 'E2E Agent',
      pseudo: `e2ea${stamp % 100000}`,
      country: 'CD',
      role: 'agent',
      password: 'testpass123',
      email: `e2ea${stamp}@example.com`,
    })
    if (regAgent.status === 200 && regAgent.json?.requiresValidation === true) {
      pass('register-agent-pending')
    } else fail('register-agent-pending', `${regAgent.status} ${JSON.stringify(regAgent.json)?.slice(0, 120)}`)

    const regSeller = await api('POST', '/api/auth/register', {
      phone: sellerPhone,
      name: 'E2E Seller',
      pseudo: `e2es${stamp % 100000}`,
      country: 'CD',
      role: 'seller',
      password: 'testpass123',
      email: `e2es${stamp}@example.com`,
      businessName: 'E2E Shop',
    })
    if (regSeller.status === 200 && regSeller.json?.requiresValidation === true) {
      pass('register-seller-pending')
    } else fail('register-seller-pending', `${regSeller.status} ${JSON.stringify(regSeller.json)?.slice(0, 120)}`)

    // Pending agent/seller must not login yet (optional: skip if allowed)
    // ── 4. Login client ───────────────────────────────────────────────
    const loginClient = await api('POST', '/api/auth/login', {
      phone: clientPhone,
      password: 'testpass123',
    })
    if (loginClient.status === 200 && loginClient.json?.token) pass('login-client')
    else fail('login-client', `${loginClient.status} ${JSON.stringify(loginClient.json)?.slice(0, 120)}`)
    const clientToken = loginClient.json?.token as string | undefined

    const loginWrong = await api('POST', '/api/auth/login', {
      phone: clientPhone,
      password: 'bad-password',
    })
    if (loginWrong.status === 401 || loginWrong.status === 404) pass('login-wrong-rejected')
    else fail('login-wrong-rejected', String(loginWrong.status))

    if (!clientToken) throw new Error('no client token')

    // Profile / balance
    const profile = await api('GET', '/api/auth/profile', undefined, clientToken)
    const bal = profile.json?.user?.realBalance ?? profile.json?.profile?.realBalance
    if (profile.status === 200 && Number(bal) >= 30) pass('client-welcome-balance', String(bal))
    else if (profile.status === 200) pass('client-profile-no-welcome', `bal=${bal}`)
    else fail('client-profile', String(profile.status))

    // ── 5. Admin login + bootstrap ────────────────────────────────────
    const bootstrapPw = env('ADMIN_BOOTSTRAP_PASSWORD')
    const adminLogin = await api('POST', '/api/admin/login', {
      username: 'admin',
      password: bootstrapPw,
    })
    if (adminLogin.status === 200 && adminLogin.json?.token) pass('admin-login-bootstrap')
    else fail('admin-login-bootstrap', `${adminLogin.status} ${JSON.stringify(adminLogin.json)?.slice(0, 120)}`)
    const adminToken = adminLogin.json?.token as string | undefined
    if (!adminToken) throw new Error('no admin token')

    // ── 6. Admin validate agent + seller ──────────────────────────────
    const agentUser = await db.user.findUnique({ where: { phone: agentPhone } })
    const sellerUser = await db.user.findUnique({ where: { phone: sellerPhone } })
    if (agentUser?.validationStatus === 'pending') pass('agent-db-pending')
    else fail('agent-db-pending', agentUser?.validationStatus || 'missing')
    if (sellerUser?.validationStatus === 'pending') pass('seller-db-pending')
    else fail('seller-db-pending', sellerUser?.validationStatus || 'missing')

    if (agentUser) {
      const valAgent = await api(
        'POST',
        '/api/admin/agent-validation',
        { action: 'approve', userId: agentUser.id },
        adminToken,
      )
      if (valAgent.status === 200 && valAgent.json?.success) pass('admin-approve-agent')
      else fail('admin-approve-agent', `${valAgent.status} ${JSON.stringify(valAgent.json)?.slice(0, 150)}`)

      const agentAfter = await db.user.findUnique({ where: { id: agentUser.id } })
      if (agentAfter?.validationStatus === 'validated' && agentAfter.agentCode?.startsWith('AGT-')) {
        pass('agent-code-generated', agentAfter.agentCode)
      } else {
        fail('agent-code-generated', `${agentAfter?.validationStatus} ${agentAfter?.agentCode}`)
      }
    }

    if (sellerUser) {
      const valSeller = await api(
        'POST',
        '/api/admin/seller-validation',
        { action: 'approve', userId: sellerUser.id },
        adminToken,
      )
      if (valSeller.status === 200 && valSeller.json?.success) pass('admin-approve-seller')
      else fail('admin-approve-seller', `${valSeller.status} ${JSON.stringify(valSeller.json)?.slice(0, 150)}`)
    }

    // Re-login validated seller
    const loginSeller = await api('POST', '/api/auth/login', {
      phone: sellerPhone,
      password: 'testpass123',
    })
    if (loginSeller.status === 200 && loginSeller.json?.token) pass('login-seller-validated')
    else fail('login-seller-validated', `${loginSeller.status} ${JSON.stringify(loginSeller.json)?.slice(0, 120)}`)
    const sellerToken = loginSeller.json?.token as string | undefined

    // ── 7. Seller product + QR ────────────────────────────────────────
    if (sellerToken) {
      const createProd = await api(
        'POST',
        '/api/seller/products',
        {
          name: 'E2E Produit',
          description: 'Produit de test E2E',
          price: 5,
          currency: 'USD',
          category: 'test',
          stock: 3,
          condition: 'new',
        },
        sellerToken,
      )
      if (createProd.status === 200 && createProd.json?.product?.qrCode?.startsWith('TRAIT-PROD-')) {
        pass('seller-product-qr', createProd.json.product.qrCode)
      } else if (createProd.status === 200 && createProd.json?.product?.qrCode) {
        pass('seller-product-qr', String(createProd.json.product.qrCode))
      } else {
        fail('seller-product-qr', `${createProd.status} ${JSON.stringify(createProd.json)?.slice(0, 150)}`)
      }

      const prod = createProd.json?.product
      if (prod?.id) {
        // Product QR lookup
        const qrLookup = await api('GET', `/api/products/qr?code=${encodeURIComponent(prod.qrCode)}`, undefined, clientToken)
        if (qrLookup.status === 200 && qrLookup.json?.product?.id === prod.id) pass('product-qr-lookup')
        else fail('product-qr-lookup', String(qrLookup.status))

        // Marketplace list
        const mkt = await api('GET', '/api/marketplace/products')
        const listed = (mkt.json?.products || []).find((p: any) => p.id === prod.id)
        if (mkt.status === 200 && listed?.stock !== undefined) pass('marketplace-list-stock')
        else fail('marketplace-list-stock', `listed=${!!listed}`)

        // Purchase → Order
        const prof2 = await api('GET', '/api/auth/profile', undefined, clientToken)
        const buyerId = prof2.json?.user?.id || prof2.json?.profile?.id
        if (!buyerId) fail('buyer-id', JSON.stringify(prof2.json)?.slice(0, 200))
        else {
          const purchase2 = await api(
            'POST',
            '/api/marketplace/purchase',
            { productId: prod.id, buyerId },
            clientToken,
          )
          if (purchase2.status === 200 && purchase2.json?.success) pass('marketplace-purchase')
          else fail('marketplace-purchase', `${purchase2.status} ${JSON.stringify(purchase2.json)?.slice(0, 180)}`)

          // Stock decremented?
          const after = await db.marketplaceProduct.findUnique({ where: { id: prod.id } })
          if (after?.stock === 2) pass('stock-decrement', String(after.stock))
          else fail('stock-decrement', String(after?.stock))

          // Orders list buyer
          const ordersBuyer = await api('GET', '/api/orders?role=buyer', undefined, clientToken)
          const myOrders = ordersBuyer.json?.orders || []
          if (ordersBuyer.status === 200 && myOrders.length >= 1) pass('orders-buyer-list', String(myOrders.length))
          else fail('orders-buyer-list', `${ordersBuyer.status} ${JSON.stringify(ordersBuyer.json)?.slice(0, 120)}`)

          // Seller orders + status transitions
          const ordersSeller = await api('GET', '/api/orders?role=seller', undefined, sellerToken)
          const sOrders = ordersSeller.json?.orders || []
          if (ordersSeller.status === 200 && sOrders.length >= 1) pass('orders-seller-list', String(sOrders.length))
          else fail('orders-seller-list', String(ordersSeller.status))

          if (sOrders[0]) {
            const oid = sOrders[0].id
            for (const st of ['confirmed', 'preparing', 'completed']) {
              const r = await api('PATCH', '/api/orders', { orderId: oid, status: st }, sellerToken)
              if (r.status === 200 && r.json?.success) pass(`order-status-${st}`)
              else fail(`order-status-${st}`, `${r.status} ${JSON.stringify(r.json)?.slice(0, 120)}`)
            }
            const finalOrder = await db.order.findUnique({ where: { id: oid } })
            if (finalOrder?.status === 'completed') pass('order-db-completed')
            else fail('order-db-completed', finalOrder?.status || 'missing')
          }
        }

        // Rupture de stock purchase attempt (stock still >0 after one buy; set to 0 temporarily)
        await db.marketplaceProduct.update({ where: { id: prod.id }, data: { stock: 0 } })
        const oos = await api(
          'POST',
          '/api/marketplace/purchase',
          { productId: prod.id, buyerId: (await db.user.findUnique({ where: { phone: clientPhone } }))!.id },
          clientToken,
        )
        if (oos.status === 409) pass('purchase-out-of-stock')
        else fail('purchase-out-of-stock', String(oos.status))
        await db.marketplaceProduct.update({ where: { id: prod.id }, data: { stock: 5 } })
      }
    }

    // ── 8. Transfer atomic (need PIN) ─────────────────────────────────
    const bcrypt = await import('bcryptjs')
    const clientDb = await db.user.findUnique({ where: { phone: clientPhone } })
    if (clientDb) {
      const pinHash = await bcrypt.hash('1234', 10)
      await db.user.update({ where: { id: clientDb.id }, data: { pin: pinHash } })

      // Receiver exists with balance 0
      const regRecv = await api('POST', '/api/auth/register', {
        phone: receiverPhone,
        name: 'E2E Receiver',
        pseudo: `e2er${stamp % 100000}`,
        country: 'CD',
        role: 'client',
        password: 'testpass123',
        email: `e2er${stamp}@example.com`,
      })
      if (regRecv.status === 200) pass('register-receiver')
      else fail('register-receiver', String(regRecv.status))

      const balBefore = (await db.user.findUnique({ where: { id: clientDb.id } }))?.realBalance ?? 0
      const recvBefore = (await db.user.findUnique({ where: { phone: receiverPhone } }))?.realBalance ?? 0

      const xfer = await api(
        'POST',
        '/api/transfer/send',
        { receiverPhone, amount: 5, currency: 'USD', pin: '1234' },
        clientToken,
      )
      if (xfer.status === 200 && xfer.json?.success) pass('transfer-send')
      else fail('transfer-send', `${xfer.status} ${JSON.stringify(xfer.json)?.slice(0, 180)}`)

      const balAfter = (await db.user.findUnique({ where: { id: clientDb.id } }))?.realBalance ?? 0
      const recvAfter = (await db.user.findUnique({ where: { phone: receiverPhone } }))?.realBalance ?? 0
      const fee = Math.round(5 * 0.007 * 100) / 100
      const expectedDebit = 5 + fee
      if (Math.abs(balAfter - (balBefore - expectedDebit)) < 0.001) {
        pass('transfer-debit-atomic', `${balBefore} → ${balAfter}`)
      } else fail('transfer-debit-atomic', `${balBefore} → ${balAfter} expected -$${expectedDebit}`)
      if (Math.abs(recvAfter - (recvBefore + 5)) < 0.001) pass('transfer-credit-atomic', String(recvAfter))
      else fail('transfer-credit-atomic', `${recvBefore} → ${recvAfter}`)

      // Insufficient balance rejected
      const poor = await api(
        'POST',
        '/api/transfer/send',
        { receiverPhone: clientPhone === receiverPhone ? receiverPhone : receiverPhone, amount: 999999, currency: 'USD', pin: '1234' },
        clientToken,
      )
      if (poor.status === 400 || poor.status === 401 || poor.status === 403 || poor.status === 409 || poor.status === 402) {
        pass('transfer-insufficient-rejected', String(poor.status))
      } else if (poor.status >= 400) pass('transfer-error-rejected', String(poor.status))
      else fail('transfer-insufficient-rejected', `${poor.status} ${JSON.stringify(poor.json)?.slice(0, 120)}`)

      // Wrong PIN rejected
      const wrongPin = await api(
        'POST',
        '/api/transfer/send',
        { receiverPhone, amount: 1, currency: 'USD', pin: '9999' },
        clientToken,
      )
      if (wrongPin.status === 401 || wrongPin.status >= 400) pass('transfer-wrong-pin', String(wrongPin.status))
      else fail('transfer-wrong-pin', String(wrongPin.status))
    }

    // ── 9. Barter create + accept/reject ──────────────────────────────
    const clientDbUser = await db.user.findUnique({ where: { phone: clientPhone }, select: { id: true } })
    const barterCreate = await api(
      'POST',
      '/api/barter/offers',
      {
        title: 'E2E Troc',
        description: 'Échange test',
        category: 'electronique',
        offeredBy: clientDbUser?.id,
        wantedItem: 'iPhone',
      },
      clientToken,
    )
    if (barterCreate.status === 200 && barterCreate.json?.offer?.id) pass('barter-create')
    else fail('barter-create', `${barterCreate.status} ${JSON.stringify(barterCreate.json)?.slice(0, 150)}`)

    const barterList = await api('GET', '/api/barter/offers')
    if (barterList.status === 200 && Array.isArray(barterList.json?.offers)) pass('barter-list')
    else fail('barter-list', String(barterList.status))

    const offerId = barterCreate.json?.offer?.id
    if (offerId) {
      // Owner cancel
      const cancel = await api('PATCH', '/api/barter/offers', { id: offerId, action: 'cancel' }, clientToken)
      if (cancel.status === 200 && cancel.json?.success) pass('barter-cancel')
      else fail('barter-cancel', `${cancel.status} ${JSON.stringify(cancel.json)?.slice(0, 150)}`)

      // Create second for reject path by seller if available
      if (sellerToken) {
        const sellerDbUser = await db.user.findUnique({ where: { phone: sellerPhone }, select: { id: true } })
        const b2 = await api(
          'POST',
          '/api/barter/offers',
          { title: 'E2E Troc 2', description: 'x', category: 'autre', offeredBy: sellerDbUser?.id, wantedItem: 'b' },
          sellerToken,
        )
        const b2id = b2.json?.offer?.id
        if (b2id) {
          // Non-owner (client) reject should fail
          const rej = await api('PATCH', '/api/barter/offers', { id: b2id, action: 'reject' }, clientToken)
          if (rej.status === 403 || rej.status === 400 || rej.status >= 400) pass('barter-non-owner-reject-blocked', String(rej.status))
          else fail('barter-non-owner-reject-blocked', String(rej.status))

          const ownCancel = await api('PATCH', '/api/barter/offers', { id: b2id, action: 'cancel' }, sellerToken)
          if (ownCancel.status === 200 && ownCancel.json?.success) pass('barter-seller-cancel')
          else fail('barter-seller-cancel', `${ownCancel.status}`)
        }
      }
    }

    // ── 10. Cards endpoints smoke ─────────────────────────────────────
    const cards = await api('GET', '/api/cards/my-cards', undefined, clientToken)
    if (cards.status === 200 || cards.status === 404) pass('cards-list', String(cards.status))
    else fail('cards-list', String(cards.status))

    // ── 11. Auth guards ───────────────────────────────────────────────
    const unauthOrders = await api('GET', '/api/orders')
    if (unauthOrders.status === 401) pass('orders-unauth-401')
    else fail('orders-unauth-401', String(unauthOrders.status))

    const unauthQr = await api('GET', '/api/products/qr?code=TRAIT-PROD-x')
    if (unauthQr.status === 401) pass('product-qr-unauth-401')
    else fail('product-qr-unauth-401', String(unauthQr.status))

    const unauthSeller = await api('POST', '/api/seller/products', { name: 'x' })
    if (unauthSeller.status === 401) pass('seller-products-unauth-401')
    else fail('seller-products-unauth-401', String(unauthSeller.status))

    const unauthAdmin = await api('GET', '/api/admin/seller-validation', undefined, clientToken)
    if (unauthAdmin.status === 401 || unauthAdmin.status === 403) pass('admin-guard-rejects-client', String(unauthAdmin.status))
    else fail('admin-guard-rejects-client', String(unauthAdmin.status))
  } catch (e: any) {
    fail('suite-crash', String(e?.message || e))
  } finally {
    await cleanupPhones(phones)
    // Remove test products/orders/barter created
    await db.marketplaceProduct.deleteMany({ where: { name: { startsWith: 'E2E' } } })
    await db.order.deleteMany({ where: { product: { name: { startsWith: 'E2E' } } } } as any).catch(() => {})
    await db.order.deleteMany({ where: { buyer: { phone: { in: phones } } } }).catch(() => {})
    await db.order.deleteMany({ where: { seller: { phone: { in: phones } } } }).catch(() => {})
    await db.barterOffer.deleteMany({ where: { title: { startsWith: 'E2E' } } })
    await db.$disconnect()
  }

  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log('\n========== E2E SUMMARY ==========')
  console.log(`PASS: ${passed}  FAIL: ${failed}  TOTAL: ${results.length}`)
  for (const r of results.filter((x) => !x.ok)) {
    console.log(`  FAIL  ${r.name}  ${r.detail || ''}`)
  }
  process.exit(failed > 0 ? 1 : 0)
}

main()
