import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

const LEGACY_PREFIX = 'enc:v1:'
const CURRENT_PREFIX = 'enc:v2:'
const ASSOCIATED_DATA = Buffer.from('trait:kyc-document:v2', 'utf8')

function getLegacyKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required to encrypt KYC documents')
  return createHmac('sha256', secret).update('trait:kyc-document-encryption:v1').digest()
}

function getCurrentKey() {
  const configuredKey = process.env.KYC_ENCRYPTION_KEY
  if (!configuredKey) return getLegacyKey()
  if (!/^[a-f0-9]{64}$/i.test(configuredKey)) {
    throw new Error('KYC_ENCRYPTION_KEY must be a 32-byte key encoded as 64 hexadecimal characters')
  }
  return Buffer.from(configuredKey, 'hex')
}

export function encryptKycDocument(value: string): string {
  if (!value || value.startsWith(LEGACY_PREFIX) || value.startsWith(CURRENT_PREFIX)) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getCurrentKey(), iv)
  cipher.setAAD(ASSOCIATED_DATA)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${CURRENT_PREFIX}${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ciphertext.toString('base64')}`
}

export function decryptKycDocument(value: string | null): string | null {
  if (!value || (!value.startsWith(LEGACY_PREFIX) && !value.startsWith(CURRENT_PREFIX))) return value
  const isCurrent = value.startsWith(CURRENT_PREFIX)
  const match = value.match(/^enc:v[12]:([a-f0-9]{24}):([a-f0-9]{32}):([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('Invalid encrypted KYC document')
  const [, ivHex, tagHex, ciphertext] = match
  const encryptedBytes = Buffer.from(ciphertext, 'base64')
  const keys = isCurrent && process.env.KYC_ENCRYPTION_KEY
    ? [getCurrentKey(), getLegacyKey()]
    : [isCurrent ? getCurrentKey() : getLegacyKey()]

  for (const key of keys) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
      if (isCurrent) decipher.setAAD(ASSOCIATED_DATA)
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
      return Buffer.concat([decipher.update(encryptedBytes), decipher.final()]).toString('utf8')
    } catch {
      continue
    }
  }
  throw new Error('KYC document authentication failed')
}
