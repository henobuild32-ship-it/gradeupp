export async function offlineFetch(url: string, fetchOptions: RequestInit = {}): Promise<Response> {

  try {
    if (!navigator.onLine) throw new Error('offline')
    const response = await fetch(url, fetchOptions)
    return response
  } catch (error) {
    if (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT' || fetchOptions.method === 'DELETE') {
      return new Response(JSON.stringify({
        success: false,
        offline: true,
        message: 'Connexion indisponible. Cette opération n’a pas été envoyée; réessayez lorsque vous serez en ligne.',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    throw error
  }
}
