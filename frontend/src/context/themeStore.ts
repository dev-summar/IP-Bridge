import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    setThemeHelper(nextTheme);
    set({ theme: nextTheme });
  },

  setTheme: (theme) => {
    setThemeHelper(theme);
    set({ theme });
  },

  initializeTheme: () => {
    // Product default is light (not system dark).
    setThemeHelper('light');
    set({ theme: 'light' });
  },
}));

function setThemeHelper(theme: 'light' | 'dark') {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  localStorage.setItem('pb_theme', theme);
}
