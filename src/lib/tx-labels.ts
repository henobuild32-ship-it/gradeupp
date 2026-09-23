const depositMethods: Record<string, string> = {
  agent: 'Dépôt via agent',
  ussd_agent: 'Dépôt via agent (USSD)',
  mobile_money: 'Dépôt Mobile Money',
  bank_transfer: 'Dépôt par virement bancaire',
  card: 'Dépôt par carte',
};

const withdrawalMethods: Record<string, string> = {
  agent: 'Retrait via agent',
  ussd_agent: 'Retrait via agent (USSD)',
  mobile_money: 'Retrait Mobile Money',
  bank_transfer: 'Retrait par virement bancaire',
};

export function depositMethodLabel(method: string): string {
  return depositMethods[method] || `Dépôt via ${String(method).replace(/_/g, ' ')}`;
}

export function withdrawalMethodLabel(method: string): string {
  return withdrawalMethods[method] || `Retrait via ${String(method).replace(/_/g, ' ')}`;
}

export function formatAmount(amount: number, currency: string): string {
  const cur = currency === 'FC' ? 'FC' : currency || 'USD';
  if (cur === 'FC') return `${amount.toFixed(2)} FC`;
  return `$${amount.toFixed(2)}`;
}
