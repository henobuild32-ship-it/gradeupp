export const MAX_KYC_IMAGE_BYTES = 1.5 * 1024 * 1024

type KycImageValidation =
  | { valid: true; mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; byteLength: number }
  | { valid: false; reason: 'format' | 'encoding' | 'size' | 'signature' }

const signatures: Record<string, (bytes: Buffer) => boolean> = {
  'image/jpeg': (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (bytes) => bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
}

/** Validates KYC image data at the persistence boundary; client-supplied MIME is not trusted. */
export function validateKycImageDataUrl(value: unknown): KycImageValidation {
  if (typeof value !== 'string') return { valid: false, reason: 'format' }
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match) return { valid: false, reason: 'format' }

  const [, mimeType, base64] = match
  if (base64.length % 4 !== 0) return { valid: false, reason: 'encoding' }
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.toString('base64') !== base64) return { valid: false, reason: 'encoding' }
  if (bytes.length > MAX_KYC_IMAGE_BYTES) return { valid: false, reason: 'size' }
  if (!signatures[mimeType](bytes)) return { valid: false, reason: 'signature' }

  return { valid: true, mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp', byteLength: bytes.length }
}
