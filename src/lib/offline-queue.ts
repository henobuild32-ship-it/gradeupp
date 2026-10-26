const DB_NAME = 'trait-offline-sw'
const DB_VERSION = 1
const STORE_NAME = 'pending'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface PendingTransaction {
  id?: number
  url: string
  method: string
  body: string
  headers: string
  createdAt: number
  retries: number
}

function isSafeToSync(url: string, method: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin === window.location.origin && parsed.pathname === '/api/ussd/favorites' && method.toUpperCase() === 'POST'
  } catch {
    return false
  }
}

export async function savePendingTransaction(data: Omit<PendingTransaction, 'id' | 'createdAt' | 'retries'>) {
  if (!isSafeToSync(data.url, data.method)) return false
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.add({ ...data, createdAt: Date.now(), retries: 0 })
    return true
  } catch {
    return false
  }
}

export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function removePendingTransaction(id: number) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
  } catch {}
}

export async function syncPendingTransactions(): Promise<{ synced: number; failed: number }> {
  // Sync from the page so failures are visible and authenticated cookies are included.
  const pending = await getPendingTransactions()
  let synced = 0
  let failed = 0

  for (const ptx of pending) {
    if (!isSafeToSync(ptx.url, ptx.method)) {
      // Older app versions queued money-moving requests. Never replay them automatically.
      await removePendingTransaction(ptx.id!)
      failed++
      continue
    }
    try {
      const headers = ptx.headers ? JSON.parse(ptx.headers) : {}
      const res = await fetch(ptx.url, {
        method: ptx.method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: ptx.body,
        credentials: 'include',
      })
      if (res.ok || res.status === 409) {
        await removePendingTransaction(ptx.id!)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
