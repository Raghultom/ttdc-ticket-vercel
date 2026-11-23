import { create } from 'zustand';
import type { User } from '../types/models';
import * as authApi from '../services/api/auth';

interface AuthState {
  user: User | null;
  activeCounterId: string | null;
  initializing: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setActiveCounter: (counterId: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  activeCounterId: null,
  initializing: true,
  error: null,

  init: async () => {
    const user = await authApi.getCurrentUser();
    set({ user, activeCounterId: user ? authApi.getActiveCounterId() : null, initializing: false });
  },

  login: async (username, password) => {
    set({ error: null });
    try {
      const user = await authApi.login(username, password);
      set({ user, activeCounterId: authApi.getActiveCounterId() });
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message });
      throw err;
    }
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null, activeCounterId: null });
  },

  setActiveCounter: (counterId) => {
    authApi.setActiveCounterId(counterId);
    set({ activeCounterId: counterId });
  },
}));
