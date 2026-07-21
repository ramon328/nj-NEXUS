// src/utils/validators.ts
export const useDebounced = <T,>(value: T, delay = 400) => {
    const [v, setV] = React.useState(value);
    React.useEffect(() => {
      const id = setTimeout(() => setV(value), delay);
      return () => clearTimeout(id);
    }, [value, delay]);
    return v;
  };
  
  // ===== helpers base
  export function isNonEmpty(s?: string) {
    return !!(s && s.trim().length > 0);
  }
  export function trimOrEmpty(s?: string) {
    return (s || '').trim();
  }
  
  // ===== Email
  export function normalizeEmail(email: string) {
    return trimOrEmpty(email).toLowerCase();
  }
  export function isValidEmail(email?: string) {
    const e = normalizeEmail(email || '');
    // RFC-like simple
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  }
  
  // ===== Color HEX
  export function normalizeHex(hex?: string) {
    const s = trimOrEmpty(hex).replace(/#/g, '').toUpperCase();
    if (/^[0-9A-F]{6}$/.test(s)) return `#${s}`;
    if (/^[0-9A-F]{3}$/.test(s)) {
      const r = s[0] + s[0], g = s[1] + s[1], b = s[2] + s[2];
      return `#${r}${g}${b}`.toUpperCase();
    }
    return '#51BDE5';
  }
  export function isValidHex(hex?: string) {
    const s = trimOrEmpty(hex).replace('#', '');
    return /^[0-9a-fA-F]{6}$/.test(s) || /^[0-9a-fA-F]{3}$/.test(s);
  }
  
  // ===== Teléfono Chile (celular): +56 9 XXXXXXXX
  export function onlyDigits(s: string) {
    return (s || '').replace(/\D+/g, '');
  }
  export function normalizePhoneCL(phone?: string) {
    const d = onlyDigits(phone || '');
    // permite: 56 9 xxxxxxxx | +56 9 xxxxxxxx | 9 xxxxxxxx | xxxxxxxx (asumiendo celular)
    if (d.length >= 11 && d.startsWith('569')) return `+${d.slice(0, 11)}`;
    if (d.length === 9 && d.startsWith('9')) return `+56${d}`;
    if (d.length === 8) return `+569${d}`;
    // fallback invalido
    return '';
  }
  export function formatPhonePrettyCL(phone?: string) {
    const norm = normalizePhoneCL(phone || '');
    // +569XXXXXXXX → +56 9 XXXX XXXX
    const m = norm.match(/^\+569(\d{4})(\d{4})$/);
    if (m) return `+56 9 ${m[1]} ${m[2]}`;
    return phone || '';
  }
  export function isValidPhoneCL(phone?: string) {
    const norm = normalizePhoneCL(phone || '');
    return /^\+569\d{8}$/.test(norm);
  }
  
  // ===== Geoloc / Address
  export function isValidLatLng(lat?: number, lng?: number) {
    const a = typeof lat === 'number' && lat >= -90 && lat <= 90;
    const b = typeof lng === 'number' && lng >= -180 && lng <= 180;
    return a && b;
  }
  export function isValidAddress(addr?: string) {
    return isNonEmpty(addr) && trimOrEmpty(addr).length >= 6;
  }
  
  // ===== Password
  export function isStrongPassword(p?: string) {
    const s = trimOrEmpty(p);
    return s.length >= 8; // puedes endurecer: mayúsculas, minúsculas, dígitos, símbolo
  }
  