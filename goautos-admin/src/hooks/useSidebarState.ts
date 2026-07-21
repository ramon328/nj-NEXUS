import { useState } from 'react';

export const useSidebarState = () => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return {
    collapsed,
    toggleSidebar,
  };
};
