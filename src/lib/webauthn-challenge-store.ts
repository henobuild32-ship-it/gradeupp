import { createHash } from 'node:crypto'
import { db } from '@/lib/db'

/** Records a verified WebAuthn challenge once so retries across serverless instances fail closed. */
export async function consumeWebAuthnChallenge(purpose: string, challenge: string, userId: string): Promise<boolean> {
  const expiresBefore = new Date(Date.now() - 10 * 60 * 1000)
  await db.securityLog.deleteMany({
    where: { action: 'webauthn_challenge_consumed', createdAt: { lt: expiresBefore } },
  })

  const id = `webauthn_${createHash('sha256').update(`${purpose}:${challenge}`).digest('hex')}`
  try {
    await db.securityLog.create({
      data: { id, userId, action: 'webauthn_challenge_consumed', details: purpose, riskLevel: 'low' },
    })
    return true
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return false
    throw error
  }
}
