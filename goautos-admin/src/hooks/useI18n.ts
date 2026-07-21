import { useTranslation as useReactI18next } from 'react-i18next';

export const useI18n = () => {
  const { t, i18n } = useReactI18next();

  // Helper functions for different namespaces
  const tCommon = (key: string) => t(key, { ns: 'common' });
  const tNav = (key: string) => t(key, { ns: 'navigation' });
  const tForm = (key: string) => t(key, { ns: 'forms' });

  // Language utilities with fallback
  const normalizeLanguage = (lang: string): 'es' | 'en' => {
    // Extract language code if it's in format like 'es-ES' or 'en-US'
    const langCode = lang.split('-')[0];
    return langCode === 'en' || langCode === 'es' ? langCode : 'es';
  };

  const language = normalizeLanguage(i18n.language);
  const setLanguage = (lng: 'es' | 'en') => {
    i18n.changeLanguage(lng);
  };

  const isSpanish = language === 'es';
  const isEnglish = language === 'en';

  // Pluralization helper
  const tPlural = (singular: string, plural: string, count: number) => {
    return count === 1 ? tCommon(singular) : tCommon(plural);
  };

  return {
    t,
    tCommon,
    tNav,
    tForm,
    tPlural,
    language,
    setLanguage,
    isSpanish,
    isEnglish,
    i18n,
  };
};
