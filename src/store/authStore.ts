import { create } from 'zustand';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
}

interface AuthState {
  user: GitHubUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Get current user ID for storage key (exported for vctStore)
export const getCurrentUserId = (): string | null => {
  return useAuthStore.getState().user?.id.toString() || null;
};

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_BASE}/api/auth/user`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.authenticated) {
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        // Reload user-specific projects after auth check
        const { reloadUserProjects } = await import('./vctStore');
        reloadUserProjects();
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
        // Load anonymous projects
        const { reloadUserProjects } = await import('./vctStore');
        reloadUserProjects();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: () => {
    // Redirect to GitHub OAuth
    window.location.href = `${API_BASE}/api/auth/login`;
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      set({ user: null, isAuthenticated: false });
      // Reload to anonymous projects
      const { reloadUserProjects } = await import('./vctStore');
      reloadUserProjects();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
