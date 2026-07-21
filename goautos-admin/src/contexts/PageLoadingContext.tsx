import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface PageLoadingContextType {
  registerLoader: () => () => void;
  isPageLoading: boolean;
}

const PageLoadingContext = createContext<PageLoadingContextType>({
  registerLoader: () => () => {},
  isPageLoading: false,
});

export const usePageLoading = () => useContext(PageLoadingContext);

/**
 * Hook for components to signal they are loading data.
 * The loading screen stays visible until all registered loaders complete.
 */
export const useRegisterLoader = (isLoading: boolean) => {
  const { registerLoader } = usePageLoading();
  const unregisterRef = useRef<(() => void) | null>(null);

  // Use layout effect to register synchronously before paint
  React.useLayoutEffect(() => {
    if (isLoading) {
      if (!unregisterRef.current) {
        unregisterRef.current = registerLoader();
      }
    } else {
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    }
    return () => {
      if (unregisterRef.current) {
        unregisterRef.current();
        unregisterRef.current = null;
      }
    };
  }, [isLoading, registerLoader]);
};

export const PageLoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeLoaders, setActiveLoaders] = useState(0);

  const registerLoader = useCallback(() => {
    setActiveLoaders((c) => c + 1);
    let called = false;
    return () => {
      if (!called) {
        called = true;
        setActiveLoaders((c) => Math.max(0, c - 1));
      }
    };
  }, []);

  return (
    <PageLoadingContext.Provider value={{ registerLoader, isPageLoading: activeLoaders > 0 }}>
      {children}
    </PageLoadingContext.Provider>
  );
};
