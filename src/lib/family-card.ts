export type CardCurrency = 'USD' | 'FC';

export type CardRelation = 'child' | 'family';

export const CARD_LOAD_CAP: Record<CardCurrency, number> = {
  USD: 1000,
  FC: 3000000,
};

export function loadCapFor(currency: CardCurrency, cardMaxLoad?: number | null): number {
  if (cardMaxLoad != null && cardMaxLoad > 0) return cardMaxLoad;
  return CARD_LOAD_CAP[currency];
}

export function formatLoadCap(currency: CardCurrency): string {
  return currency === 'USD' ? '1 000 $ USD' : '3 000 000 CDF';
}

export function formatCardAmount(amount: number, currency: CardCurrency): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} USD`;
  }
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} CDF`;
}

export function relationLabel(relation?: string | null): string {
  return relation === 'family' ? 'Membre de la famille' : 'Enfant';
}
