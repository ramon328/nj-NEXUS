'use client';

import React, { useEffect, useState } from 'react';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import { Button } from '@/components/ui/button';
import { useAIChat } from '@/hooks/useAIChat';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import aiAnimation from '@/assets/ai-animation.json';

const SHOW_MS = 4000;
const HIDE_MS = 20000;

const FloatingAIButton: React.FC = () => {
  const { isOpen, toggleChat } = useAIChat();
  const { tCommon } = useI18n();
  const [showText, setShowText] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Ciclo automático visible/oculto
  useEffect(() => {
    if (isHovered) return;
    let t: ReturnType<typeof setTimeout>;

    const hide = () => {
      t = setTimeout(() => {
        setShowText(false);
        show();
      }, SHOW_MS);
    };
    const show = () => {
      t = setTimeout(() => {
        setShowText(true);
        hide();
      }, HIDE_MS);
    };

    if (showText) hide();
    else show();

    return () => clearTimeout(t);
  }, [showText, isHovered]);

  if (isOpen) return null;

  const expanded = showText || isHovered;

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'rounded-full p-[2px] bg-gradient-to-r from-primary to-cyan-500 hover:brightness-110',
        'shadow-lg shadow-primary/30 transition-transform hover:scale-105 '
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={toggleChat}
        title={tCommon('aiAssistant.buttonTitle')}
        className={cn(
          'relative overflow-hidden rounded-full flex items-center justify-center',
          'bg-black/30 hover:bg-black/30  backdrop-blur-sm text-white font-medium',
          'transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]'
        )}
        style={{ height: 56, padding: 0 }}
      >
        {/* Animación Lottie */}
        <Lottie animationData={aiAnimation} loop className="w-14 h-14" />

        {/* Texto animado */}
        <div
          className={cn(
            'transform-gpu transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]',
            expanded
              ? 'opacity-100 max-w-[100px] translate-x-0 mr-3'
              : 'opacity-0 max-w-0 -translate-x-2 mr-0'
          )}
        >
          <p className="text-sm whitespace-nowrap">
            {tCommon('aiAssistant.buttonLabel')}
          </p>
        </div>
      </button>
    </div>
  );
};

export default FloatingAIButton;
