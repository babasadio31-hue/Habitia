import { create } from 'zustand';
import { User, UserRole } from '@habitia/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => {
    localStorage.setItem('habitia_token', token);
    localStorage.setItem('habitia_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('habitia_token');
    localStorage.removeItem('habitia_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  checkAuth: () => {
    const token = localStorage.getItem('habitia_token');
    const userStr = localStorage.getItem('habitia_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true });
      } catch (e) {
        localStorage.removeItem('habitia_token');
        localStorage.removeItem('habitia_user');
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  }
}));
