import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_KYC_IMAGE_BYTES, validateKycImageDataUrl } from '../src/lib/kyc-image-validation.ts'

function dataUrl(mime: string, bytes: Buffer) {
  return `data:${mime};base64,${bytes.toString('base64')}`
}

describe('KYC image validation', () => {
  it('accepts image data only when the MIME type matches its file signature', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00])
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const webp = Buffer.from('RIFF0000WEBP', 'ascii')

    assert.equal(validateKycImageDataUrl(dataUrl('image/jpeg', jpeg)).valid, true)
    assert.equal(validateKycImageDataUrl(dataUrl('image/png', png)).valid, true)
    assert.equal(validateKycImageDataUrl(dataUrl('image/webp', webp)).valid, true)
    assert.deepEqual(validateKycImageDataUrl(dataUrl('image/png', jpeg)), { valid: false, reason: 'signature' })
  })

  it('rejects non-image URLs, malformed base64 and empty images', () => {
    assert.deepEqual(validateKycImageDataUrl('https://example.invalid/id.jpg'), { valid: false, reason: 'format' })
    assert.deepEqual(validateKycImageDataUrl('data:image/jpeg;base64,***'), { valid: false, reason: 'format' })
    assert.deepEqual(validateKycImageDataUrl('data:image/jpeg;base64,AAAA='), { valid: false, reason: 'encoding' })
    assert.deepEqual(validateKycImageDataUrl('data:image/jpeg;base64,'), { valid: false, reason: 'format' })
  })

  it('enforces the maximum raw image size before KYC persistence', () => {
    const jpeg = Buffer.alloc(MAX_KYC_IMAGE_BYTES + 1)
    jpeg.set([0xff, 0xd8, 0xff])
    assert.deepEqual(validateKycImageDataUrl(dataUrl('image/jpeg', jpeg)), { valid: false, reason: 'size' })
  })
})
