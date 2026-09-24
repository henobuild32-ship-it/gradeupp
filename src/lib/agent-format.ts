/**
 * Formate la saisie d'un code agent côté client.
 * - Depot (allowPhone=false) : toujours AGT-XXXXXX
 * - Retrait (allowPhone=true) : AGT-XXXXXX ou numero +228...
 */
export function formatAgentCodeInput(raw: string, allowPhone = false): string {
  if (!raw) return '';

  // Numero international preserve tel quel
  if (allowPhone && raw.startsWith('+')) {
    return raw.slice(0, 16);
  }

  const upper = raw.toUpperCase().replace(/\s+/g, '');

  // Saisie type AGT-... (avec ou sans trait d'union)
  if (upper.startsWith('AGT')) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    return digits ? `AGT-${digits}` : '';
  }

  const digits = raw.replace(/\D/g, '');

  if (!allowPhone) {
    // Depot : code agent uniquement — prefixe des que 6 chiffres
    if (digits.length >= 6) return `AGT-${digits.slice(0, 6)}`;
    return digits;
  }

  // Retrait : 6 chiffres => code agent ; plus => numero sans +
  if (digits.length === 6) return `AGT-${digits}`;
  if (digits.length > 6) return digits.slice(0, 15);
  return digits;
}

/** Affiche un code agent sans doubler le prefixe AGT- */
export function displayAgentCode(code: string | null | undefined): string {
  if (!code) return '';
  const trimmed = code.trim();
  if (/^AGT-/i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '').slice(0, 6);
    return digits ? `AGT-${digits}` : trimmed.toUpperCase();
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 6) return `AGT-${digits.slice(0, 6)}`;
  if (digits) return `AGT-${digits}`;
  return trimmed;
}
