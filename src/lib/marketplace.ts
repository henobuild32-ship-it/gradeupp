export const PRODUCT_PAYMENT_METHODS = [
  { key: 'trait_number', label: 'Numéro Trait' },
  { key: 'trait_card', label: 'Carte bancaire Trait' },
  { key: 'trait_wallet', label: 'Wallet Trait' },
] as const

export type ProductPaymentMethodKey = (typeof PRODUCT_PAYMENT_METHODS)[number]['key']

export const MAX_PRODUCT_IMAGES = 5
export const MAX_IMAGE_DATA_URL_LENGTH = 900_000
export const BARTER_CHAT_TTL_MS = 48 * 60 * 60 * 1000

export function paymentMethodLabel(key: string): string {
  return PRODUCT_PAYMENT_METHODS.find((m) => m.key === key)?.label || key
}

export function parsePaymentMethods(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((k): k is string =>
      typeof k === 'string' && PRODUCT_PAYMENT_METHODS.some((m) => m.key === k)
    )
  } catch {
    return []
  }
}

export function parseImages(raw: unknown): string[] {
  if (!raw || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((i): i is string => typeof i === 'string' && i.length > 0)
  } catch {
    return []
  }
}

export function serializeJsonArray(values: string[]): string {
  return JSON.stringify(values)
}

export function validateImageList(images: unknown): { ok: boolean; error?: string; images: string[] } {
  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, error: 'Ajoutez au moins une photo', images: [] }
  }
  if (images.length > MAX_PRODUCT_IMAGES) {
    return { ok: false, error: `Maximum ${MAX_PRODUCT_IMAGES} photos`, images: [] }
  }
  for (const img of images) {
    if (typeof img !== 'string' || !img.startsWith('data:image/')) {
      return { ok: false, error: 'Format de photo invalide', images: [] }
    }
    if (img.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return { ok: false, error: 'Photo trop volumineuse', images: [] }
    }
  }
  return { ok: true, images: images as string[] }
}

export function validatePaymentMethodsList(raw: unknown): { ok: boolean; error?: string; methods: string[] } {
  let methods: string[] = []
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      methods = Array.isArray(parsed) ? parsed : []
    } catch {
      methods = []
    }
  } else if (Array.isArray(raw)) {
    methods = raw
  }
  const valid = methods.filter((m): m is string =>
    typeof m === 'string' && PRODUCT_PAYMENT_METHODS.some((pm) => pm.key === m)
  )
  if (valid.length === 0) {
    return { ok: false, error: 'Sélectionnez au moins un moyen de paiement', methods: [] }
  }
  return { ok: true, methods: valid }
}

export function formatMarketPrice(price: number, currency: string): string {
  if (currency === 'FC') {
    return `${price.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC`
  }
  return `$${price.toFixed(2)}`
}

export function remainingChatTime(createdAt: string | Date): number {
  const created = new Date(createdAt).getTime()
  return Math.max(0, created + BARTER_CHAT_TTL_MS - Date.now())
}

export function formatRemainingTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours >= 1) return `${hours} h ${minutes.toString().padStart(2, '0')} min`
  return `${minutes} min`
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image invalide'))
    img.src = src
  })
}

export async function compressImageFile(
  file: File,
  opts: { maxSize?: number; quality?: number } = {}
): Promise<string> {
  const { maxSize = 1024, quality = 0.78 } = opts
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'))
    reader.readAsDataURL(file)
  })
  const img = await loadImageElement(rawUrl)
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function cropSquareDataUrl(
  src: string,
  crop: { offsetX: number; offsetY: number; zoom: number },
  outputSize = 800
): Promise<string> {
  return loadImageElement(src).then((img) => {
    const baseSize = Math.min(img.width, img.height) / crop.zoom
    const maxOffset = (Math.max(img.width, img.height) - baseSize) / 2
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, crop.offsetX))
    const offsetY = Math.max(-maxOffset, Math.min(maxOffset, crop.offsetY))
    const sx = (img.width - baseSize) / 2 + offsetX
    const sy = (img.height - baseSize) / 2 + offsetY
    const canvas = document.createElement('canvas')
    canvas.width = outputSize
    canvas.height = outputSize
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponible')
    ctx.drawImage(img, sx, sy, baseSize, baseSize, 0, 0, outputSize, outputSize)
    return canvas.toDataURL('image/jpeg', 0.78)
  })
}
