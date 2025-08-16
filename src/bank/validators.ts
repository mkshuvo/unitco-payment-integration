/**
 * Server-side validation helpers for bank account data
 * Implements algorithms from design plan Section 4
 */

/**
 * Validates US ACH routing number using checksum algorithm
 */
export function isValidUsRouting(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  
  const digits = routing.split('').map(Number);
  const sum = 3 * (digits[0] + digits[3] + digits[6]) + 
              7 * (digits[1] + digits[4] + digits[7]) + 
              (digits[2] + digits[5] + digits[8]);
  
  return sum % 10 === 0;
}

/**
 * Validates IBAN using mod-97 algorithm
 */
export function isValidIban(ibanRaw: string): boolean {
  const iban = ibanRaw.replace(/\s+/g, '').toUpperCase();
  
  if (!/^[A-Z0-9]+$/.test(iban) || iban.length < 15 || iban.length > 34) {
    return false;
  }
  
  // Move first 4 chars to end and convert letters to numbers
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const expanded = rearranged.replace(/[A-Z]/g, ch => 
    (ch.charCodeAt(0) - 55).toString()
  );
  
  // Calculate mod-97 in chunks
  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    const chunk = expanded.slice(i, i + 7);
    remainder = Number(String(remainder) + chunk) % 97;
  }
  
  return remainder === 1;
}

/**
 * Validates SWIFT/BIC format
 */
export function isValidSwift(swift: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift);
}

/**
 * Masks account number to show only last 4 digits
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return `****${accountNumber.slice(-4)}`;
}

/**
 * Validates account number length for US ACH
 */
export function isValidUsAccountNumber(accountNumber: string): boolean {
  return /^\d{4,17}$/.test(accountNumber);
}

/**
 * Country-specific IBAN length validation
 */
const IBAN_LENGTHS: Record<string, number> = {
  'US': 0, // US doesn't use IBAN
  'GB': 22, // United Kingdom
  'DE': 22, // Germany
  'FR': 27, // France
  'IT': 27, // Italy
  'ES': 24, // Spain
  'NL': 18, // Netherlands
  'BE': 16, // Belgium
  'CH': 21, // Switzerland
  'AT': 20, // Austria
  'SE': 24, // Sweden
  'NO': 15, // Norway
  'DK': 18, // Denmark
  'FI': 18, // Finland
  'PL': 28, // Poland
  'CZ': 24, // Czech Republic
  'HU': 28, // Hungary
  'RO': 24, // Romania
  'BG': 22, // Bulgaria
  'HR': 21, // Croatia
  'SI': 19, // Slovenia
  'SK': 24, // Slovakia
  'LT': 20, // Lithuania
  'LV': 21, // Latvia
  'EE': 20, // Estonia
  'IE': 22, // Ireland
  'PT': 25, // Portugal
  'GR': 27, // Greece
  'CY': 28, // Cyprus
  'LU': 20, // Luxembourg
  'MT': 31, // Malta
};

export function getIbanLengthForCountry(countryCode: string): number {
  return IBAN_LENGTHS[countryCode.toUpperCase()] || 0;
}

export function isValidIbanForCountry(iban: string, countryCode: string): boolean {
  const expectedLength = getIbanLengthForCountry(countryCode);
  if (expectedLength === 0) return false; // Country doesn't use IBAN
  
  return iban.length === expectedLength && isValidIban(iban);
}
