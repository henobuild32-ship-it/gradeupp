/** Remove private, obsolete offline copies left by an older client version. */
export function clearRetiredOfflineData(): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem('trait-ussd-cache')
  } catch {
    // Storage can be unavailable in private browsing; the app must still boot.
  }

  try {
    window.indexedDB?.deleteDatabase('trait-offline-sw')
  } catch {
    // IndexedDB can be disabled; there is no active feature depending on it.
  }
}
