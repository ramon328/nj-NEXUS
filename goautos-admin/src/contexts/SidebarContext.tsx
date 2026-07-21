import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';

// Helper function to safely interact with localStorage
const storageKey = 'sidebar-collapsed';

const getStoredValue = (): boolean => {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : true;
  } catch (error) {
    console.error('Error reading sidebar state from localStorage:', error);
    return true; // Default to collapsed
  }
};

const setStoredValue = (value: boolean): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error('Error storing sidebar state to localStorage:', error);
  }
};

interface SidebarContextProps {
  collapsed: boolean;
  toggleSidebar: () => void;
  mobileSheetOpen: boolean;
  setMobileSheetOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextProps>({
  collapsed: true,
  toggleSidebar: () => {},
  mobileSheetOpen: false,
  setMobileSheetOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Try to get the sidebar state from localStorage, with a default value
  const [collapsed, setCollapsed] = useState<boolean>(getStoredValue);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Store the sidebar state in localStorage when it changes
  useEffect(() => {
    setStoredValue(collapsed);
  }, [collapsed]);

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  // Usar useMemo para prevenir recreaciones innecesarias del valor del contexto
  const contextValue = useMemo(
    () => ({
      collapsed,
      toggleSidebar,
      mobileSheetOpen,
      setMobileSheetOpen,
    }),
    [collapsed, mobileSheetOpen]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
};
