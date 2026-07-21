import * as React from 'react';

export interface SiteConfig {
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  fonts: {
    title: string;
    body: string;
  };
  backgroundColor: string;
}

const defaultConfig: SiteConfig = {
  colors: {
    primary: '#1a1a1a',
    secondary: '#10b981',
    tertiary: '#8b5cf6',
  },
  fonts: {
    title: 'Inter',
    body: 'Inter',
  },
  backgroundColor: '#ffffff',
};

interface ConfigContextType {
  config: SiteConfig;
  updateColors: (colors: Partial<SiteConfig['colors']>) => void;
  updateFonts: (fonts: Partial<SiteConfig['fonts']>) => void;
  updateBackgroundColor: (backgroundColor: string) => void;
  resetConfig: () => void;
}

const ConfigContext = React.createContext<ConfigContextType | undefined>(
  undefined
);

export const useConfig = () => {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = React.useState<SiteConfig>(defaultConfig);

  // Apply the configuration to CSS variables
  React.useEffect(() => {
    const root = document.documentElement;

    // Apply colors
    root.style.setProperty('--color-primary', config.colors.primary);
    root.style.setProperty('--color-secondary', config.colors.secondary);
    root.style.setProperty('--color-tertiary', config.colors.tertiary);

    // Apply fonts
    root.style.setProperty('--font-title', config.fonts.title);
    root.style.setProperty('--font-body', config.fonts.body);

    // Apply background color
    root.style.setProperty('--background-color', config.backgroundColor);
  }, [config]);

  const updateColors = (colors: Partial<SiteConfig['colors']>) => {
    setConfig((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        ...colors,
      },
    }));
  };

  const updateFonts = (fonts: Partial<SiteConfig['fonts']>) => {
    setConfig((prev) => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        ...fonts,
      },
    }));
  };

  const updateBackgroundColor = (backgroundColor: string) => {
    setConfig((prev) => ({
      ...prev,
      backgroundColor,
    }));
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateColors,
        updateFonts,
        updateBackgroundColor,
        resetConfig,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};
