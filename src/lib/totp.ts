import crypto from 'crypto'

const DIGITS = 6
const PERIOD = 30
const ALGORITHM = 'sha1'

function generateSecret(): string {
  const buffer = crypto.randomBytes(20)
  return base32Encode(buffer)
}

function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0')
  }
  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0')
    result += alphabet[parseInt(chunk, 2)]
  }
  return result
}

function base32Decode(str: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of str.toUpperCase()) {
    const val = alphabet.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  }
  return bytes
}

function generateTOTP(secret: string, time?: number): string {
  const currentTime = time || Math.floor(Date.now() / 1000)
  const counter = Math.floor(currentTime / PERIOD)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigInt64BE(BigInt(counter))

  const secretBuffer = base32Decode(secret)
  const hmac = crypto.createHmac(ALGORITHM, secretBuffer).update(counterBuffer).digest()

  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  return String(code % Math.pow(10, DIGITS)).padStart(DIGITS, '0')
}

function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000)
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, currentTime + i * PERIOD)
    if (expected === token) return true
  }
  return false
}

function getTOTPUri(secret: string, email: string, issuer = 'TRAIT'): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`
}

function generateRecoveryCodes(count = 10): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: count }, () => crypto.randomBytes(12).toString('hex').toUpperCase())
  return { codes, hashes: codes.map(hashRecoveryCode) }
}

function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.replace(/\s+/g, '').toUpperCase()).digest('hex')
}

export { generateSecret, generateTOTP, verifyTOTP, getTOTPUri, generateRecoveryCodes, hashRecoveryCode }
