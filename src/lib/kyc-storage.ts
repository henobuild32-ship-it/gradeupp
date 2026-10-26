import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

const PREFIX = 'enc:v1:'

function getKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required to encrypt KYC documents')
  return createHmac('sha256', secret).update('trait:kyc-document-encryption:v1').digest()
}

export function encryptKycDocument(value: string): string {
  if (!value || value.startsWith(PREFIX)) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${PREFIX}${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ciphertext.toString('base64')}`
}

export function decryptKycDocument(value: string | null): string | null {
  if (!value || !value.startsWith(PREFIX)) return value
  const match = value.match(/^enc:v1:([a-f0-9]{24}):([a-f0-9]{32}):([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('Invalid encrypted KYC document')
  const [, ivHex, tagHex, ciphertext] = match
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8')
}
