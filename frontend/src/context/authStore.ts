import { create } from 'zustand';

interface IUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'buyer';
  organization?: string;
  interests?: string[];
  domains?: string[];
  savedPatents: string[];
}

interface AuthState {
  token: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: IUser) => void;
  updateUser: (user: Partial<IUser>) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export type { IUser };

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (token, user) => {
    localStorage.setItem('pb_token', token);
    localStorage.setItem('pb_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  updateUser: (updatedUser) => {
    const currentUser = get().user;
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedUser };
      localStorage.setItem('pb_user', JSON.stringify(newUser));
      set({ user: newUser });
    }
  },

  logout: () => {
    localStorage.removeItem('pb_token');
    localStorage.removeItem('pb_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: async () => {
    try {
      const token = localStorage.getItem('pb_token');
      const userStr = localStorage.getItem('pb_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });

        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const freshUser = await res.json();
          set({ user: freshUser, isAuthenticated: true });
          localStorage.setItem('pb_user', JSON.stringify(freshUser));
        } else {
          get().logout();
        }
      }
    } catch (e) {
      get().logout();
    } finally {
      set({ isInitialized: true });
    }
  },
}));
