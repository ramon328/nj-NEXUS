// src/hooks/usePhoneValidation.ts
import { useEffect, useRef, useState } from 'react';
import { toE164 } from '@/utils/phone';
import type { CountryCode } from 'libphonenumber-js';

type State = {
  e164: string | null;
  isValid: boolean;
  isPossible: boolean;
  checking: boolean;
};

export function usePhoneValidation(input: string, defaultCountry: CountryCode = 'CL', delay = 300): State {
  const [state, setState] = useState<State>({ e164: null, isValid: false, isPossible: false, checking: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const { e164, isValid, isPossible } = toE164(input, defaultCountry);
      setState({ e164, isValid, isPossible, checking: false });
    }, delay);
    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, [input, defaultCountry, delay]);

  return state;
}
