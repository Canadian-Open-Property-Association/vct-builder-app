import { create } from 'zustand';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5174';

export interface AccessLog {
  id: number;
  event_type: 'login' | 'app_access';
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  app_id: string | null;
  app_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

export interface LogFilters {
  event_type?: string;
  username?: string;
  app_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface AdminState {
  isAdmin: boolean;
  isAdminLoading: boolean;
  isAdminChecked: boolean;
  logs: AccessLog[];
  pagination: Pagination;
  filters: LogFilters;
  isLogsLoading: boolean;
  error: string | null;

  checkAdminStatus: () => Promise<void>;
  fetchLogs: (filters?: LogFilters, page?: number) => Promise<void>;
  setFilters: (filters: LogFilters) => void;
  clearFilters: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  isAdmin: false,
  isAdminLoading: false,
  isAdminChecked: false,
  logs: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    total_pages: 0,
  },
  filters: {},
  isLogsLoading: false,
  error: null,

  checkAdminStatus: async () => {
    // Don't re-check if already checked
    if (get().isAdminChecked) return;

    set({ isAdminLoading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/api/admin/check`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to check admin status');
      }

      const data = await response.json();
      set({ isAdmin: data.isAdmin, isAdminLoading: false, isAdminChecked: true });
    } catch (error) {
      set({
        isAdmin: false,
        isAdminLoading: false,
        isAdminChecked: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  fetchLogs: async (filters?: LogFilters, page?: number) => {
    set({ isLogsLoading: true, error: null });

    try {
      const currentFilters = filters ?? get().filters;
      const currentPage = page ?? get().pagination.page;

      // Build query string
      const params = new URLSearchParams();
      if (currentFilters.event_type) params.set('event_type', currentFilters.event_type);
      if (currentFilters.username) params.set('username', currentFilters.username);
      if (currentFilters.app_id) params.set('app_id', currentFilters.app_id);
      if (currentFilters.start_date) params.set('start_date', currentFilters.start_date);
      if (currentFilters.end_date) params.set('end_date', currentFilters.end_date);
      params.set('page', currentPage.toString());
      params.set('limit', get().pagination.limit.toString());

      const response = await fetch(`${API_BASE}/api/admin/logs?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      set({
        logs: data.logs,
        pagination: data.pagination,
        filters: currentFilters,
        isLogsLoading: false
      });
    } catch (error) {
      set({
        isLogsLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  setFilters: (filters: LogFilters) => {
    set({ filters });
    // Reset to page 1 when filters change and fetch
    get().fetchLogs(filters, 1);
  },

  clearFilters: () => {
    set({ filters: {} });
    get().fetchLogs({}, 1);
  },
}));
