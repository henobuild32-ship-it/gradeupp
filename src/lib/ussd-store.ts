'use client';

import { savePendingTransaction } from '@/lib/offline-queue';

const CACHE_KEY = 'trait-ussd-cache';

interface UssdCacheData {
  balances: { usd: number; fc: number; bonusUsd: number; bonusFc: number };
  favorites: Array<{ id: string; label: string; phone: string; type: string }>;
  history: Array<{ type: string; amount: number; currency: string; date: string; detail: string }>;
  settings: { language: string; smsNotifications: boolean };
  agentNames: Record<string, { name: string; businessName: string | null }>;
  lastUpdated: number;
}

function readCache(): UssdCacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(data: Partial<UssdCacheData>) {
  try {
    const existing = readCache() || { balances: { usd: 0, fc: 0, bonusUsd: 0, bonusFc: 0 }, favorites: [], history: [], settings: { language: 'fr', smsNotifications: false }, agentNames: {}, lastUpdated: 0 };
    const merged = { ...existing, ...data, lastUpdated: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
  } catch { /* silent */ }
}

export function getCachedBalances() {
  return readCache()?.balances || { usd: 0, fc: 0, bonusUsd: 0, bonusFc: 0 };
}

export function getCachedFavorites() {
  return readCache()?.favorites || [];
}

export function getCachedHistory() {
  return readCache()?.history || [];
}

export function getCachedSettings() {
  return readCache()?.settings || { language: 'fr', smsNotifications: false };
}

export function getCachedAgentName(code: string): string | null {
  const agents = readCache()?.agentNames || {};
  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
  const entry = agents[normalized];
  return entry ? (entry.businessName || entry.name) : null;
}

export async function fetchAndCacheBalances(userId: string) {
  try {
    const res = await fetch(`/api/ussd/balance?userId=${userId}&currency=USD`);
    const data = await res.json();
    if (data.success) {
      writeCache({ balances: { usd: data.totalBalance ?? 0, fc: data.totalBalanceFC ?? data.totalBalance ?? 0, bonusUsd: data.bonusBalance ?? 0, bonusFc: data.bonusBalanceFC ?? 0 } });
      return data;
    }
  } catch { /* silent */ }
  return null;
}

export async function fetchAndCacheFavorites(userId: string) {
  try {
    const res = await fetch(`/api/ussd/favorites?userId=${userId}`);
    const data = await res.json();
    if (data.success) {
      writeCache({ favorites: data.favorites });
      return data.favorites;
    }
  } catch { /* silent */ }
  return getCachedFavorites();
}

export async function fetchAndCacheSettings(userId: string) {
  try {
    const res = await fetch(`/api/ussd/settings?userId=${userId}`);
    const data = await res.json();
    if (data.success) {
      writeCache({ settings: { language: data.settings.ussdLanguage, smsNotifications: data.settings.smsNotifications } });
      return data.settings;
    }
  } catch { /* silent */ }
  return getCachedSettings();
}

export async function resolveAgentName(agentCode: string): Promise<string | null> {
  const cached = getCachedAgentName(agentCode);
  if (cached) return cached;

  try {
    const normalized = agentCode.trim().toUpperCase().replace(/\s+/g, '');
    const res = await fetch(`/api/ussd/agent-lookup?code=${encodeURIComponent(normalized)}`);
    const data = await res.json();
    if (data.success && data.agent) {
      const agents = readCache()?.agentNames || {};
      agents[normalized] = { name: data.agent.name, businessName: null };
      writeCache({ agentNames: agents });
      return data.agent.name;
    }
  } catch { /* silent */ }
  return null;
}

export function queueOfflineTransaction(url: string, method: string, body: any) {
  savePendingTransaction({
    url,
    method,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
  });
}
