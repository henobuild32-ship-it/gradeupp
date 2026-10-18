'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Images, Loader2, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { compressImageFile, cropSquareDataUrl } from '@/lib/marketplace'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
  max?: number
  minSize?: number
  compact?: boolean
}

export default function ProductImagePicker({ images, onChange, max = 5, minSize = 0, compact = false }: Props) {
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [processing, setProcessing] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const [activeDrag, setActiveDrag] = useState(false)

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setProcessing(true)
    try {
      const dataUrl = await compressImageFile(file, { maxSize: 1200, quality: 0.82 })
      setCropSrc(dataUrl)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    } catch {
      toast.error('Photo illisible. Réessayez avec un autre fichier.')
    } finally {
      setProcessing(false)
    }
  }, [])

  const confirmCrop = useCallback(async () => {
    if (!cropSrc) return
    setProcessing(true)
    try {
      const cropped = await cropSquareDataUrl(cropSrc, { offsetX: offset.x, offsetY: offset.y, zoom }, minSize || 800)
      if (images.length >= max) {
        toast.error(`Maximum ${max} photos`)
      } else {
        onChange([...images, cropped])
      }
      setCropSrc(null)
    } catch {
      toast.error('Erreur lors du recadrage')
    } finally {
      setProcessing(false)
    }
  }, [cropSrc, offset, zoom, images, onChange, max, minSize])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!viewportRef.current) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y }
    setActiveDrag(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    setOffset({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
    setActiveDrag(false)
  }

  useEffect(() => {
    const prevent = (e: TouchEvent) => e.preventDefault()
    const el = viewportRef.current
    if (el) {
      el.addEventListener('touchmove', prevent, { passive: false })
      return () => el.removeEventListener('touchmove', prevent)
    }
  }, [cropSrc])

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border group">
              <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer"
                aria-label={`Supprimer la photo ${idx + 1}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < max && (
        <div className={`flex gap-2 ${compact ? '' : 'flex-wrap'}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={processing}
            onClick={() => cameraInputRef.current?.click()}
          >
            {processing ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            <span className="ml-1">Photo</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={processing}
            onClick={() => galleryInputRef.current?.click()}
          >
            <Images className="size-4" />
            <span className="ml-1">Galerie</span>
          </Button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {images.length}/{max} photo{max > 1 ? 's' : ''} · recadrage carré, JPEG compressé
      </p>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {cropSrc && (
        <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border w-full max-w-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Recadrer la photo</h3>
              <button type="button" onClick={() => setCropSrc(null)} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center cursor-pointer">
                <X className="size-4" />
              </button>
            </div>
            <div
              ref={viewportRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`relative w-full aspect-square rounded-xl overflow-hidden border border-border select-none ${activeDrag ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <img
                src={cropSrc}
                alt="Aperçu recadrage"
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none"
                style={{
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                }}
              />
              <div className="absolute inset-6 border-2 border-white/70 rounded-lg pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}>
                Réinitialiser
              </Button>
              <Button type="button" className="flex-1 bg-[#0D5C63] hover:bg-[#0A4A50] text-white" onClick={() => void confirmCrop()} disabled={processing}>
                {processing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Valider
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
