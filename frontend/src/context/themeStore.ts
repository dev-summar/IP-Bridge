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
    const savedTheme = localStorage.getItem('pb_theme') as 'light' | 'dark';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setThemeHelper(initialTheme);
    set({ theme: initialTheme });
  }
}));

function setThemeHelper(theme: 'light' | 'dark') {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  localStorage.setItem('pb_theme', theme);
}
