import { create } from 'zustand';
import { isInIframe } from '../hooks/useIframeMode';

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
  loginPopup: () => Promise<void>;
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
        // Reload user-specific data after auth check
        const { reloadUserProjects } = await import('./vctStore');
        const { reloadUserTemplates } = await import('./zoneTemplateStore');
        reloadUserProjects();
        reloadUserTemplates();
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
        // Load anonymous data
        const { reloadUserProjects } = await import('./vctStore');
        const { reloadUserTemplates } = await import('./zoneTemplateStore');
        reloadUserProjects();
        reloadUserTemplates();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: () => {
    // If in iframe, use popup login to avoid redirect issues
    if (isInIframe()) {
      useAuthStore.getState().loginPopup();
      return;
    }
    // Redirect to GitHub OAuth
    window.location.href = `${API_BASE}/api/auth/login`;
  },

  loginPopup: async () => {
    // Open OAuth in a popup window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${API_BASE}/api/auth/login?popup=true`,
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );

    if (!popup) {
      set({ error: 'Popup blocked. Please allow popups for this site.' });
      return;
    }

    // Listen for message from popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_CALLBACK') {
        window.removeEventListener('message', handleMessage);
        popup.close();

        if (event.data.success) {
          // Re-check auth to load user data
          await useAuthStore.getState().checkAuth();
        } else {
          set({ error: event.data.error || 'Authentication failed' });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Also handle popup being closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 500);
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      set({ user: null, isAuthenticated: false });
      // Reload to anonymous data
      const { reloadUserProjects } = await import('./vctStore');
      const { reloadUserTemplates } = await import('./zoneTemplateStore');
      reloadUserProjects();
      reloadUserTemplates();
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  clearError: () => set({ error: null }),
}));
