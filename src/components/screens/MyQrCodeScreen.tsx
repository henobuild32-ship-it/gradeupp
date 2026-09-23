'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Download,
  Share2,
  Copy,
  Check,
  Shield,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAppStore } from '@/lib/store'

export default function MyQrCodeScreen() {
  const { user, navigateTo } = useAppStore()
  const svgRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const qrValue = typeof window !== 'undefined'
    ? `${window.location.origin}/pay/${user.id}`
    : `https://trait-rho.vercel.app/pay/${user.id}`

  const renderToCanvas = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      if (!svgRef.current) return resolve(null)
      const svgEl = svgRef.current.querySelector('svg')
      if (!svgEl) return resolve(null)

      const svgData = new XMLSerializer().serializeToString(svgEl)
      const canvas = document.createElement('canvas')
      canvas.width = 1000
      canvas.height = 1200
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)

      const img = new Image()
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      img.onload = () => {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 100, 60, 800, 800)

        ctx.fillStyle = '#0D5C63'
        ctx.font = 'bold 36px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(user.name || 'Utilisateur', 500, 940)
        ctx.fillStyle = '#666'
        ctx.font = '26px Arial, sans-serif'
        ctx.fillText(`@${user.pseudo || user.phone || ''}`, 500, 988)
        ctx.fillStyle = '#14888F'
        ctx.font = '16px Arial, sans-serif'
        ctx.fillText(qrValue, 500, 1030)

        URL.revokeObjectURL(url)
        canvas.toBlob((b) => resolve(b), 'image/png')
      }
      img.src = url
    })

  const downloadQR = async () => {
    const blob = await renderToCanvas()
    if (!blob) return
    const link = document.createElement('a')
    link.download = `trait-qr-${user.pseudo || user.phone || 'user'}.png`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('QR Code téléchargé')
  }

  const handleShare = async () => {
    const blob = await renderToCanvas()
    if (!blob) return
    try {
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'trait-qr.png', { type: 'image/png' })] })) {
        await navigator.share({
          title: 'Mon QR Code TRAIT',
          text: `Scannez mon QR Code pour me payer sur TRAIT : @${user.pseudo || ''}`,
          files: [new File([blob], 'trait-qr.png', { type: 'image/png' })],
        })
      } else {
        await navigator.clipboard.writeText(qrValue)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast.success('Lien copié dans le presse-papier')
      }
    } catch {}
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Lien de paiement copié')
    } catch {
      toast.error('Erreur de copie')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={() => navigateTo('home')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Mon QR Code</h1>
          <p className="text-xs text-gray-500">Paiement par scan sécurisé</p>
        </div>
        <div className="px-2 py-1 bg-[#0D5C63]/10 rounded-full">
          <span className="text-xs font-bold text-[#0D5C63]">v2.0</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-sm shadow-lg border-0">
          <CardContent className="p-6 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6 w-full">
              <div className="w-14 h-14 rounded-full bg-[#0D5C63] flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white text-xl font-bold">
                  {(user.name || user.pseudo || '?')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-lg text-gray-900 truncate">{user.name || 'Utilisateur'}</p>
                <p className="text-sm text-gray-500 truncate">@{user.pseudo || user.phone}</p>
              </div>
            </div>

            <div ref={svgRef} className="bg-white p-4 rounded-xl border-2 border-gray-200 mb-4 shadow-sm">
              <QRCodeSVG
                value={qrValue}
                size={260}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
                includeMargin={false}
              />
            </div>

            <p className="text-xs text-gray-400 text-center mb-6 max-w-xs">
              Scannez ce QR code avec l&apos;application TRAIT pour me payer instantanément en toute sécurité
            </p>

            <div className="flex gap-3 w-full">
              <Button onClick={downloadQR} variant="outline" className="flex-1 gap-2 h-12 border-gray-200">
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
              <Button onClick={handleShare} variant="outline" className="flex-1 gap-2 h-12 border-gray-200">
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
            </div>

            <Button onClick={copyLink} variant="ghost" className="mt-3 gap-2 text-sm text-[#14888F]">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié !' : 'Copier le lien de paiement'}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Paiement sécurisé de bout en bout</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Globe className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Lien unique par personne — <span className="text-[#14888F] font-mono">/{user.id.slice(0, 8)}</span></span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
