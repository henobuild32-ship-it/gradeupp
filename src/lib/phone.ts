import { db } from '@/lib/db'

/**
 * Recherche un utilisateur par téléphone avec variants normalisés :
 * exact → chiffres / +chiffres → 9 derniers chiffres (si match unique).
 * Évite les faux positifs sur les compteurs partagés.
 */
export async function findUserByPhone(phone: string) {
  const trimmed = (phone || '').trim()
  if (!trimmed) return null

  const exact = await db.user.findUnique({ where: { phone: trimmed } })
  if (exact) return exact

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  const variant = await db.user.findFirst({
    where: { OR: [{ phone: digits }, { phone: `+${digits}` }] },
  })
  if (variant) return variant

  if (digits.length >= 8) {
    const matches = await db.user.findMany({
      where: { phone: { endsWith: digits.slice(-9) } },
      take: 2,
    })
    if (matches.length === 1) return matches[0]
  }

  return null
}
