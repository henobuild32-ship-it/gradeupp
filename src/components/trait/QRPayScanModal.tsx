'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Camera, CameraOff, QrCode, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Capacitor } from '@capacitor/core'
import { useCameraPermission } from '@/hooks/useCameraPermission'
import jsQR from 'jsqr'

let BarcodeScannerModule: any = null

async function getBarcodeScanner() {
  if (!BarcodeScannerModule) {
    BarcodeScannerModule = await import('@capacitor-mlkit/barcode-scanning')
  }
  return BarcodeScannerModule.BarcodeScanner
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function QRPayScanModal({ open, onOpenChange }: Props) {
  const { navigateTo } = useAppStore()
  const { checkPermission, requestPermission } = useCameraPermission()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const animationRef = useRef(0)
  const pendingStreamRef = useRef<MediaStream | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanning, setScanning] = useState(false)

  function stopCamera() {
    scanningRef.current = false
    cancelAnimationFrame(animationRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraActive(false)
    setScanning(false)
  }

  async function startNativeCamera() {
    setCameraError('')
    setScanning(true)
    try {
      const BarcodeScanner = await getBarcodeScanner()
      const { camera } = await BarcodeScanner.checkPermissions()
      if (camera !== 'granted') {
        const { camera: granted } = await BarcodeScanner.requestPermissions()
        if (granted !== 'granted') {
          setCameraError("Permission caméra refusée. Autorisez la caméra dans les paramètres.")
          setScanning(false)
          return
        }
      }

      const result = await BarcodeScanner.scan({ formats: ['QR_CODE'], autoZoom: true })
      if (result.barcodes && result.barcodes.length > 0) {
        const code = result.barcodes[0]
        handleQRDetected(code.displayValue || code.rawValue || '')
      } else {
        setScanning(false)
      }
    } catch (err: any) {
      if (err.message?.includes('camera') || err.message?.includes('permission')) {
        setCameraError("Permission caméra refusée.")
      } else {
        setCameraError("Erreur lors du scan. Réessayez.")
      }
      setScanning(false)
    }
  }

  async function startCamera() {
    setCameraError('')
    setScanning(true)

    if (Capacitor.isNativePlatform()) {
      await startNativeCamera()
      return
    }

    const perm = await checkPermission()
    if (perm === 'denied') {
      setCameraError("Permission caméra refusée. Autorisez la caméra dans les paramètres.")
      setScanning(false)
      return
    }
    if (perm === 'prompt' || perm === 'prompt-with-rationale') {
      const granted = await requestPermission()
      if (granted !== 'granted') {
        setCameraError("Permission caméra refusée. Autorisez la caméra dans les paramètres.")
        setScanning(false)
        return
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      pendingStreamRef.current = stream
      setCameraActive(true)
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les paramètres.")
      setScanning(false)
    }
  }

  useEffect(() => {
    if (cameraActive && videoRef.current && pendingStreamRef.current) {
      const video = videoRef.current
      video.srcObject = pendingStreamRef.current
      streamRef.current = pendingStreamRef.current
      pendingStreamRef.current = null
      video.play().then(() => {
        scanningRef.current = true
        scanLoop()
      }).catch(() => {})
    }
  }, [cameraActive])

  function scanLoop() {
    if (!scanningRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState >= 2) {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code) {
        handleQRDetected(code.data)
        return
      }
    }
    animationRef.current = requestAnimationFrame(scanLoop)
  }

  function handleQRDetected(raw: string) {
    stopCamera()
    let recipientId = ''
    let payAmount: string | undefined
    let payCurrency: string | undefined

    // Product QR: TRAIT-PROD-... → open marketplace product detail
    if (raw.startsWith('TRAIT-PROD-') || raw.includes('TRAIT-PROD-')) {
      const code = raw.trim()
      toast.success('Produit scanné !', {
        description: 'Chargement du produit...',
      })
      onOpenChange(false)
      navigateTo('marketplace-detail', { productQr: code })
      return
    }

    try {
      const parsed = JSON.parse(raw)
      if (parsed.userId) recipientId = parsed.userId
      else if (parsed.holder) recipientId = parsed.holder
      else if (parsed.card && typeof parsed.card === 'string' && parsed.card.startsWith('usr_')) recipientId = parsed.card
      if (parsed.amount !== undefined) payAmount = String(parsed.amount)
      if (parsed.currency) payCurrency = String(parsed.currency)
      if (parsed.productId) {
        onOpenChange(false)
        navigateTo('marketplace-detail', { productId: parsed.productId })
        return
      }
    } catch {
      if (raw.startsWith('http')) {
        try {
          const url = new URL(raw)
          const payId = url.searchParams.get('pay')
          if (payId) recipientId = payId
          payAmount = url.searchParams.get('amount') || undefined
          payCurrency = url.searchParams.get('currency') || undefined
          const productId = url.searchParams.get('product')
          if (productId) {
            onOpenChange(false)
            navigateTo('marketplace-detail', { productId })
            return
          }
          // /pay/{userId} path form
          if (!recipientId) {
            const payMatch = url.pathname.match(/\/pay\/([^/?#]+)/)
            if (payMatch) recipientId = payMatch[1]
          }
        } catch {
          recipientId = raw
        }
      } else {
        recipientId = raw
      }
    }

    toast.success('QR Code scanné !', {
      description: 'Redirection vers le paiement...',
    })

    onOpenChange(false)

    if (recipientId) {
      navigateTo('send', {
        payRecipientId: recipientId,
        ...(payAmount ? { payAmount } : {}),
        ...(payCurrency ? { payCurrency } : {}),
      })
    } else {
      navigateTo('send')
    }
  }

  useEffect(() => {
    return () => {
      scanningRef.current = false
      cancelAnimationFrame(animationRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (!open) {
      stopCamera()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        {/* Close button */}
        <button
          onClick={() => { stopCamera(); onOpenChange(false) }}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-white">Scanner & Payer</h3>
          <p className="text-xs text-white/60">Scannez le QR Code du destinataire</p>
        </div>

        {/* Camera viewport */}
        <div className="relative w-full aspect-square bg-black rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
          {cameraActive ? (
            <>
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline autoPlay />
              <canvas ref={canvasRef} className="hidden" />
              {/* Scan frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-3/4 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#00D4AA] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#00D4AA] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#00D4AA] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#00D4AA] rounded-br-lg" />
                  {/* Scan line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00D4AA] to-transparent animate-pulse" style={{ top: '50%', animationDuration: '2s' }} />
                </div>
              </div>
              <div className="absolute top-4 left-4 right-4 flex justify-center">
                <span className="bg-black/60 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-sm">
                  Placez le QR code dans le cadre
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <button
                  onClick={stopCamera}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/80 text-white text-sm font-semibold backdrop-blur-sm hover:bg-red-600/80 transition-colors cursor-pointer"
                >
                  <CameraOff className="w-4 h-4" />
                  Arrêter la caméra
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-900 to-black">
              {scanning ? (
                <Loader2 className="w-10 h-10 text-[#00D4AA] animate-spin" />
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-[#0D5C63]/20 flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-[#00D4AA]" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold mb-1">Scanner un QR Code</p>
                    <p className="text-white/40 text-xs">Appuyez pour ouvrir la caméra</p>
                  </div>
                  {cameraError && (
                    <p className="text-red-400 text-xs text-center max-w-xs px-4">{cameraError}</p>
                  )}
                  <Button
                    onClick={startCamera}
                    className="bg-[#0D5C63] hover:bg-[#0A4A50] text-white rounded-xl px-6 h-11 font-semibold shadow-lg shadow-[#0D5C63]/30 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Ouvrir la caméra
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <p className="text-center text-white/30 text-[10px] mt-3">
          Le paiement sera automatiquement configuré après le scan
        </p>
      </div>
    </div>
  )
}
