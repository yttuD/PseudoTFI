/**
 * Prepare WhatsApp's click-to-chat destination without mutating a known country code.
 * Do not infer arbitrary international codes from national-format strings.
 * For legacy national numbers Rendo assumes Argentina (+54), as before.
 * Never generate wa.me links for malformed or ambiguous numbers.
 */
export function whatsappDestination(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  const compact = rawPhone.trim().replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;

  let digits = compact;
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (/^(54|55)\d{10,13}$/.test(digits) || /^1\d{10}$/.test(digits)) {
    // Already in international format (AR, BR or US/CA) without a plus sign.
  } else if (/^[1-9]\d{7,10}$/.test(digits)) {
    digits = `54${digits}`;
  } else {
    return null;
  }

  if (!/^\d{10,15}$/.test(digits) || digits.startsWith('0')) return null;
  return digits;
}

export function whatsappContactUrl(rawPhone: string | null | undefined, message: string): string | null {
  const destination = whatsappDestination(rawPhone);
  return destination ? `https://wa.me/${destination}?text=${encodeURIComponent(message)}` : null;
}
