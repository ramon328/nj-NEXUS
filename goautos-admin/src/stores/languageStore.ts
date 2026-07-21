import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Lang = 'es' | 'en';

type LanguageState = {
  language?: Lang;
  setLanguage: (lang: Lang) => void;
  clearLanguage: () => void;
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: undefined,
      setLanguage: (lang: Lang) => set({ language: lang }),
      clearLanguage: () => set({ language: undefined }),
    }),
    {
      name: 'language-preferences',
      version: 1,
      partialize: (state) => ({ language: state.language }),
    }
  )
);

