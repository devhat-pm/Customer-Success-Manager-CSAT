import { create } from 'zustand';
import { message } from 'antd';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  globalLoading: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  isMobile: false,
  globalLoading: false,

  toggleSidebar: () => {
    const { isMobile, sidebarOpen, sidebarCollapsed } = get();
    if (isMobile) {
      set({ sidebarOpen: !sidebarOpen });
    } else {
      set({ sidebarCollapsed: !sidebarCollapsed });
    }
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setIsMobile: (isMobile) => {
    set({
      isMobile,
      sidebarOpen: !isMobile,
    });
  },

  setGlobalLoading: (loading) => {
    set({ globalLoading: loading });
  },
}));

// Helper functions using Ant Design's message API
export const showSuccess = (content: string, duration: number = 3) => {
  message.success(content, duration);
};

export const showError = (content: string, duration: number = 5) => {
  message.error(content, duration);
};

export const showWarning = (content: string, duration: number = 4) => {
  message.warning(content, duration);
};

export const showInfo = (content: string, duration: number = 3) => {
  message.info(content, duration);
};

export const showLoading = (content: string = 'Loading...') => {
  return message.loading(content, 0);
};
