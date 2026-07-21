export type FormVariant = 'traditional' | 'moderna' | 'premium' | 'minimalista';

interface FormVariantStyles {
  // Layout
  gridClass: string;
  // Form card
  cardClass: string;
  cardStyle: (accent: string, cardBg: string, cardBorder: string) => React.CSSProperties;
  // Info card
  infoClass: string;
  infoStyle: (infoBg: string, cardBorder: string) => React.CSSProperties;
  // Input
  inputClass: string;
  // Button
  buttonClass: string;
}

export function getVariantStyles(variant: FormVariant = 'traditional'): FormVariantStyles {
  switch (variant) {
    case 'moderna':
      return {
        gridClass: 'grid grid-cols-1 md:grid-cols-2 gap-12',
        cardClass: 'rounded-2xl shadow-xl p-8 border-l-4',
        cardStyle: (accent, cardBg, cardBorder) => ({
          backgroundColor: cardBg,
          borderColor: accent,
          borderLeftWidth: '4px',
          borderLeftColor: accent,
          borderTopColor: cardBorder,
          borderRightColor: cardBorder,
          borderBottomColor: cardBorder,
        }),
        infoClass: 'rounded-2xl p-8 border',
        infoStyle: (infoBg, cardBorder) => ({ backgroundColor: infoBg, borderColor: cardBorder }),
        inputClass: 'h-10 rounded-xl border px-3 flex items-center',
        buttonClass: 'h-12 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-lg',
      };

    case 'premium':
      return {
        gridClass: 'grid grid-cols-1 md:grid-cols-2 gap-16',
        cardClass: 'rounded-xl p-8 border shadow-2xl',
        cardStyle: (accent, cardBg, cardBorder) => ({
          backgroundColor: cardBg,
          borderColor: `${accent}40`,
          boxShadow: `0 0 30px ${accent}15, 0 4px 20px rgba(0,0,0,0.1)`,
        }),
        infoClass: 'rounded-xl p-8 border',
        infoStyle: (infoBg, cardBorder) => ({
          backgroundColor: infoBg,
          borderColor: cardBorder,
        }),
        inputClass: 'h-10 rounded-lg border px-3 flex items-center',
        buttonClass: 'h-12 rounded-lg flex items-center justify-center text-white text-sm font-bold uppercase tracking-wider shadow-lg',
      };

    case 'minimalista':
      return {
        gridClass: 'max-w-2xl mx-auto',
        cardClass: 'p-8',
        cardStyle: (_accent, _cardBg, _cardBorder) => ({}),
        infoClass: 'p-8 mt-8 border-t',
        infoStyle: (_infoBg, cardBorder) => ({ borderColor: cardBorder }),
        inputClass: 'h-10 rounded-md border-b border-t-0 border-l-0 border-r-0 px-0 flex items-center',
        buttonClass: 'h-11 rounded-md flex items-center justify-center text-white text-sm font-medium',
      };

    case 'traditional':
    default:
      return {
        gridClass: 'grid grid-cols-1 md:grid-cols-2 gap-16',
        cardClass: 'rounded-xl shadow-lg p-8 border',
        cardStyle: (accent, cardBg, cardBorder) => ({
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderTop: `3px solid ${accent}`,
        }),
        infoClass: 'rounded-xl p-8 border',
        infoStyle: (infoBg, cardBorder) => ({ backgroundColor: infoBg, borderColor: cardBorder }),
        inputClass: 'h-10 rounded-lg border px-3 flex items-center',
        buttonClass: 'h-11 rounded-lg flex items-center justify-center text-white text-sm font-semibold',
      };
  }
}
