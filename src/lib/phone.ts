import { db } from '@/lib/db'
import { normalizeInternationalPhone } from '@/lib/countries'

/**
 * Recherche un utilisateur uniquement par variantes complètes du numéro E.164.
 * Les correspondances partielles peuvent acheminer un transfert vers le mauvais compte.
 */
export async function findUserByPhone(phone: string) {
  const trimmed = (phone || '').trim()
  if (!trimmed) return null
  const normalized = normalizeInternationalPhone(trimmed)
  if (!normalized) return null
  const digits = normalized.replace(/\D/g, '')

  // Exact international matches only. Matching by a suffix caused collisions
  // between unrelated country plans and could route a transfer to the wrong user.
  return db.user.findFirst({
    where: { OR: [{ phone: normalized }, { phone: digits }, { phone: `+${digits}` }] },
  })
}
