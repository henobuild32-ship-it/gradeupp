import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { createReceiptPdf } from '../src/lib/receipt-pdf.ts'

function tinyPngDataUrl() {
  const crc32 = (data: Buffer) => {
    let crc = 0xffffffff
    for (const byte of data) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
    const result = Buffer.alloc(4)
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
    return result
  }
  const chunk = (name: string, payload: Buffer) => {
    const type = Buffer.from(name, 'ascii')
    const data = Buffer.concat([type, payload])
    const size = Buffer.alloc(4)
    size.writeUInt32BE(payload.length)
    return Buffer.concat([size, data, crc32(data)])
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const header = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])
  const png = Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0, 0]))),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return `data:image/png;base64,${png.toString('base64')}`
}

describe('Trait receipt PDF', () => {
  it('creates a non-empty, valid PDF document with transaction details', () => {
    const bytes = createReceiptPdf({
      receiptNumber: 'RCP-TEST123',
      transactionId: 'test123',
      invoiceNumber: null,
      type: 'transfer',
      amount: 10,
      fee: 0.1,
      total: 10.1,
      currency: 'USD',
      receivingCurrency: 'CDF',
      amountReceived: 23000,
      exchangeRate: 2300,
      status: 'completed',
      description: 'Test de génération PDF',
      createdAt: '2026-10-29T12:00:00.000Z',
      sender: { name: 'Awa Exemple', phone: '+243810000000', country: 'CD' },
      receiver: { name: 'Noah Exemple', phone: '+33600000000', country: 'FR' },
      verificationUrl: 'https://trait.example/receipt/verify/test123',
      logoDataUrl: tinyPngDataUrl(),
      qrDataUrl: tinyPngDataUrl(),
    })

    assert.ok(bytes.length > 1000)
    assert.equal(Buffer.from(bytes.subarray(0, 5)).toString('ascii'), '%PDF-')
    assert.equal(Buffer.from(bytes).toString('latin1').includes('%%EOF'), true)
  })
})
