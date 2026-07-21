// src/utils/phone.ts
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export function toE164(input: string, defaultCountry: CountryCode = 'CL') {
  const raw = (input || '').trim();
  try {
    const phone = parsePhoneNumberFromString(raw, defaultCountry);
    if (!phone) return { e164: null, isValid: false, isPossible: false };
    return {
      e164: phone.number,          
      isValid: phone.isValid(),    
      isPossible: phone.isPossible(),
      country: phone.country,
    };
  } catch {
    return { e164: null, isValid: false, isPossible: false };
  }
}
