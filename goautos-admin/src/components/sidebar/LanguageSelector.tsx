import React, { useEffect, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/stores/languageStore';
import { useAuth } from '@/contexts/AuthContext';

interface LanguageSelectorProps {
  collapsed?: boolean;
}

const languages = {
  es: {
    name: 'Español',
    flag: '🇪🇸',
    icon: 'emojione:flag-for-spain',
  },
  en: {
    name: 'English',
    flag: '🇺🇸',
    icon: 'emojione:flag-for-united-states',
  },
} as const;

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  collapsed = false,
}) => {
  const { language, setLanguage: setI18nLanguage, tNav } = useI18n();
  const { client } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const storedLanguage = useLanguageStore((s) => s.language);
  const setStoredLanguage = useLanguageStore((s) => s.setLanguage);

  const currentLanguage = languages[language];

  const handleLanguageChange = (newLanguage: 'es' | 'en') => {
    setStoredLanguage(newLanguage);
    setI18nLanguage(newLanguage);
    setIsOpen(false);
  };

  // Initialize language from persisted store or client default
  useEffect(() => {
    if (storedLanguage) {
      // Sync i18n if it differs
      if (storedLanguage !== language) setI18nLanguage(storedLanguage);
    } else if (client?.default_language === 'es' || client?.default_language === 'en') {
      setStoredLanguage(client.default_language);
      setI18nLanguage(client.default_language);
    }
  }, [storedLanguage, client?.default_language]);

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-10 w-10 mx-auto rounded-xl hover:bg-gray-100 transition-all duration-300 ease-in-out sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8'
                >
                  <Icon
                    icon={currentLanguage.icon}
                    className='h-5 w-5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 xl:h-5 xl:w-5'
                  />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <DropdownMenuContent
              side='right'
              align='start'
              className='w-48 bg-white border border-gray-200 shadow-lg rounded-lg p-1'
            >
              {(
                Object.entries(languages) as [
                  'es' | 'en',
                  (typeof languages)['es' | 'en']
                ][]
              ).map(([lang, info]) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200',
                    language === lang
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <Icon icon={info.icon} className='h-4 w-4' />
                  <span className='text-sm font-medium'>{info.name}</span>
                  {language === lang && (
                    <Icon
                      icon='eva:checkmark-outline'
                      className='h-4 w-4 ml-auto text-blue-600'
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipContent
            side='right'
            className='bg-white border border-gray-200 text-xs px-3 py-1.5 shadow-md rounded-md z-50'
          >
            <div className='flex items-center gap-1.5'>
                  <span className='text-gray-800'>{tNav('sidebar.changeLanguage')}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='w-full flex items-center justify-between px-4 py-2.5 h-auto rounded-lg hover:bg-gray-50 transition-all duration-300 ease-in-out group'
        >
          <div className='flex items-center gap-3'>
            <Icon icon={currentLanguage.icon} className='h-5 w-5' />
            <span className='text-sm font-medium text-gray-700 group-hover:text-gray-900'>
              {currentLanguage.name}
            </span>
          </div>
          <Icon
            icon='eva:chevron-down-outline'
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side='right'
        align='start'
        className='w-48 bg-white border border-gray-200 shadow-lg rounded-lg p-1'
      >
        {(
          Object.entries(languages) as [
            'es' | 'en',
            (typeof languages)['es' | 'en']
          ][]
        ).map(([lang, info]) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200',
              language === lang
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-50 text-gray-700'
            )}
          >
            <Icon icon={info.icon} className='h-4 w-4' />
            <span className='text-sm font-medium'>{info.name}</span>
            {language === lang && (
              <Icon
                icon='eva:checkmark-outline'
                className='h-4 w-4 ml-auto text-blue-600'
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
