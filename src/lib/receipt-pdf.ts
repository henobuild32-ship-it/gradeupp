import { jsPDF } from 'jspdf'

export interface PdfReceiptParty {
  name: string
  phone: string | null
  country: string | null
}

export interface PdfReceiptData {
  receiptNumber: string
  transactionId: string
  invoiceNumber: string | null
  type: string
  amount: number
  fee: number
  total: number
  currency: string
  receivingCurrency: string
  amountReceived: number
  exchangeRate: number | null
  status: string
  description: string
  createdAt: string
  sender: PdfReceiptParty
  receiver: PdfReceiptParty
  verificationUrl: string
  logoDataUrl?: string
  qrDataUrl?: string
}

function formatPdfAmount(value: number) {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[\u00a0\u202f]/g, ' ')
}

export function createReceiptPdf(receipt: PdfReceiptData): Uint8Array {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({ title: `Reçu ${receipt.receiptNumber}`, author: 'Trait Fintech', subject: 'Reçu de transaction confirmé' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 18
  const right = pageWidth - margin
  let y = 56

  pdf.setFillColor(13, 92, 99)
  pdf.rect(0, 0, pageWidth, 47, 'F')
  if (receipt.logoDataUrl) pdf.addImage(receipt.logoDataUrl, 'PNG', margin, 8, 30, 30)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.text('Trait Fintech', margin + 36, 18)
  pdf.setFontSize(12)
  pdf.text('Reçu de transaction', margin + 36, 27)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(`Reçu ${receipt.receiptNumber}`, margin + 36, 34)
  if (receipt.invoiceNumber) pdf.text(`Facture ${receipt.invoiceNumber}`, margin + 36, 39)
  pdf.text(new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(receipt.createdAt)), right, 42, { align: 'right' })

  pdf.setTextColor(22, 33, 38)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('TRANSACTION CONFIRMÉE', margin, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(`Référence : ${receipt.transactionId}`, right, y, { align: 'right' })
  y += 7

  const row = (label: string, value: string) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(91, 103, 110)
    pdf.text(label, margin, y)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(22, 33, 38)
    const valueLines = pdf.splitTextToSize(value, 118)
    pdf.text(valueLines, right, y, { align: 'right' })
    y += Math.max(7, valueLines.length * 4.5)
  }
  const party = (title: string, value: PdfReceiptParty) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(13, 92, 99)
    pdf.text(title.toUpperCase(), margin, y)
    y += 6
    row('Nom', value.name || '—')
    row('Pays', value.country || '—')
    if (value.phone) row('Téléphone', value.phone)
    y += 2
  }

  row('Opération', receipt.type || 'Transaction')
  if (receipt.description) row('Description', receipt.description.slice(0, 180))
  y += 2
  party('Expéditeur', receipt.sender)
  party('Bénéficiaire', receipt.receiver)

  pdf.setDrawColor(219, 226, 228)
  pdf.line(margin, y, right, y)
  y += 8
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(13, 92, 99)
  pdf.text('DÉTAIL FINANCIER', margin, y)
  y += 7
  row('Montant envoyé', `${formatPdfAmount(receipt.amount)} ${receipt.currency}`)
  row('Frais', `${formatPdfAmount(receipt.fee)} ${receipt.currency}`)
  if (receipt.exchangeRate !== null) row('Taux appliqué (1 USD)', `${receipt.exchangeRate.toLocaleString('fr-FR').replace(/[\u00a0\u202f]/g, ' ')} CDF`)
  row('Montant reçu', `${formatPdfAmount(receipt.amountReceived)} ${receipt.receivingCurrency}`)
  pdf.setFillColor(239, 247, 246)
  pdf.roundedRect(margin, y - 4, right - margin, 13, 2, 2, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(13, 92, 99)
  pdf.text('Total débité', margin + 4, y + 4)
  pdf.text(`${formatPdfAmount(receipt.total)} ${receipt.currency}`, right - 4, y + 4, { align: 'right' })

  y += 23
  if (receipt.qrDataUrl) pdf.addImage(receipt.qrDataUrl, 'PNG', margin, y, 28, 28)
  pdf.setTextColor(22, 33, 38)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('Vérifier l’authenticité de ce reçu', margin + 34, y + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.text(pdf.splitTextToSize(receipt.verificationUrl, 118), margin + 34, y + 12)

  pdf.setDrawColor(219, 226, 228)
  pdf.line(margin, 280, right, 280)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(100, 110, 115)
  pdf.text('Trait Fintech · Document électronique vérifiable en ligne', pageWidth / 2, 286, { align: 'center' })

  return new Uint8Array(pdf.output('arraybuffer'))
}
