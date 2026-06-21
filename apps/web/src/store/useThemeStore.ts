import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    localStorage.setItem('habitia_theme', newTheme);
    set({ theme: newTheme });
  },
  initTheme: () => {
    const savedTheme = localStorage.getItem('habitia_theme') as 'light' | 'dark' | null;
    const userPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme || (userPrefersDark ? 'dark' : 'light');
    
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
    set({ theme: activeTheme });
  }
}));
