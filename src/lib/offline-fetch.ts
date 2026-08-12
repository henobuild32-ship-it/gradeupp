import { savePendingTransaction } from '@/lib/offline-queue'

interface FetchOptions extends RequestInit {
  offlineKey?: string
}

export async function offlineFetch(url: string, options: FetchOptions = {}): Promise<Response> {
  const { offlineKey, ...fetchOptions } = options

  try {
    if (!navigator.onLine) throw new Error('offline')
    const response = await fetch(url, fetchOptions)
    return response
  } catch (error) {
    if (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT' || fetchOptions.method === 'DELETE') {
      const body = typeof fetchOptions.body === 'string' ? fetchOptions.body : JSON.stringify(fetchOptions.body || {})
      const headers: Record<string, string> = {}
      if (fetchOptions.headers) {
        const h = new Headers(fetchOptions.headers)
        h.forEach((value, key) => {
          headers[key] = value
        })
      }

      await savePendingTransaction({
        url,
        method: fetchOptions.method || 'POST',
        body,
        headers: JSON.stringify(headers),
      })

      return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Transaction enregistrée. Elle sera traitée automatiquement une fois connecté.',
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    throw error
  }
}
