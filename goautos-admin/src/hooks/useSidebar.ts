
import { useState } from 'react';

export const useSidebar = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return {
    sidebarCollapsed,
    toggleSidebar,
  };
};
