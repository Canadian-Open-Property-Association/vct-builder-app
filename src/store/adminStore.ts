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

// Analytics types
export interface AnalyticsSummary {
  totalEvents: number;
  totalLogins: number;
  totalAppAccess: number;
  uniqueUsers: number;
  uniqueApps: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  logins: number;
  appAccess: number;
}

export interface UserStat {
  userId: number;
  username: string;
  displayName: string | null;
  loginCount: number;
  appAccessCount: number;
  lastSeen: string;
}

export interface AppStat {
  appId: string;
  appName: string;
  accessCount: number;
  uniqueUsers: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  timeSeriesData: TimeSeriesDataPoint[];
  userStats: UserStat[];
  appStats: AppStat[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: 'today' | '7d' | '30d' | '90d' | 'custom';
}

// Orbit Configuration types
export interface OrbitConfigStatus {
  configured: boolean;
  baseUrl: string;
  tenantId: string;
  hasApiKey: boolean;
  source: 'file' | 'environment' | null;
  configuredAt: string | null;
  configuredBy: string | null;
}

export interface OrbitConfigInput {
  baseUrl: string;
  tenantId: string;
  apiKey: string;
}

export interface OrbitTestResult {
  success: boolean;
  message: string;
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

  // Analytics state
  analytics: AnalyticsData | null;
  isAnalyticsLoading: boolean;
  analyticsDateRange: DateRange;
  activeTab: 'logs' | 'analytics' | 'orbit';

  // Orbit Configuration state
  orbitConfig: OrbitConfigStatus | null;
  isOrbitConfigLoading: boolean;
  orbitConfigError: string | null;
  orbitTestResult: OrbitTestResult | null;
  isOrbitTesting: boolean;

  checkAdminStatus: () => Promise<void>;
  fetchLogs: (filters?: LogFilters, page?: number) => Promise<void>;
  setFilters: (filters: LogFilters) => void;
  clearFilters: () => void;

  // Analytics actions
  fetchAnalytics: (startDate?: string, endDate?: string) => Promise<void>;
  setAnalyticsDateRange: (range: DateRange) => void;
  setActiveTab: (tab: 'logs' | 'analytics' | 'orbit') => void;

  // Orbit Configuration actions
  fetchOrbitConfig: () => Promise<void>;
  updateOrbitConfig: (config: OrbitConfigInput) => Promise<boolean>;
  testOrbitConnection: (config?: OrbitConfigInput) => Promise<OrbitTestResult>;
  resetOrbitConfig: () => Promise<void>;
  clearOrbitTestResult: () => void;
}

// Helper to get default date range (last 7 days)
const getDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0] + 'T23:59:59.999Z',
    preset: '7d',
  };
};

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

  // Analytics initial state
  analytics: null,
  isAnalyticsLoading: false,
  analyticsDateRange: getDefaultDateRange(),
  activeTab: 'logs',

  // Orbit Configuration initial state
  orbitConfig: null,
  isOrbitConfigLoading: false,
  orbitConfigError: null,
  orbitTestResult: null,
  isOrbitTesting: false,

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

  // Analytics actions
  fetchAnalytics: async (startDate?: string, endDate?: string) => {
    set({ isAnalyticsLoading: true, error: null });

    try {
      const range = get().analyticsDateRange;
      const start = startDate || range.startDate;
      const end = endDate || range.endDate;

      const params = new URLSearchParams();
      params.set('start_date', start);
      params.set('end_date', end);

      const response = await fetch(`${API_BASE}/api/admin/analytics?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      set({
        analytics: data,
        isAnalyticsLoading: false,
      });
    } catch (error) {
      set({
        isAnalyticsLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  setAnalyticsDateRange: (range: DateRange) => {
    set({ analyticsDateRange: range });
    get().fetchAnalytics(range.startDate, range.endDate);
  },

  setActiveTab: (tab: 'logs' | 'analytics' | 'orbit') => {
    set({ activeTab: tab });
  },

  // Orbit Configuration actions
  fetchOrbitConfig: async () => {
    set({ isOrbitConfigLoading: true, orbitConfigError: null });

    try {
      const response = await fetch(`${API_BASE}/api/admin/orbit-config`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Orbit configuration');
      }

      const data = await response.json();
      set({
        orbitConfig: data,
        isOrbitConfigLoading: false,
      });
    } catch (error) {
      set({
        isOrbitConfigLoading: false,
        orbitConfigError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  updateOrbitConfig: async (config: OrbitConfigInput) => {
    set({ isOrbitConfigLoading: true, orbitConfigError: null });

    try {
      const response = await fetch(`${API_BASE}/api/admin/orbit-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update Orbit configuration');
      }

      const data = await response.json();
      set({
        orbitConfig: {
          configured: true,
          baseUrl: data.baseUrl,
          tenantId: data.tenantId,
          hasApiKey: data.hasApiKey,
          source: data.source,
          configuredAt: data.configuredAt,
          configuredBy: data.configuredBy,
        },
        isOrbitConfigLoading: false,
      });
      return true;
    } catch (error) {
      set({
        isOrbitConfigLoading: false,
        orbitConfigError: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  },

  testOrbitConnection: async (config?: OrbitConfigInput) => {
    set({ isOrbitTesting: true, orbitTestResult: null });

    try {
      const response = await fetch(`${API_BASE}/api/admin/orbit-config/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: config ? JSON.stringify(config) : '{}',
      });

      const data = await response.json();
      set({
        isOrbitTesting: false,
        orbitTestResult: data,
      });
      return data;
    } catch (error) {
      const result = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      set({
        isOrbitTesting: false,
        orbitTestResult: result,
      });
      return result;
    }
  },

  resetOrbitConfig: async () => {
    set({ isOrbitConfigLoading: true, orbitConfigError: null });

    try {
      const response = await fetch(`${API_BASE}/api/admin/orbit-config`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to reset Orbit configuration');
      }

      // Refetch to get env var config (if any)
      await get().fetchOrbitConfig();
    } catch (error) {
      set({
        isOrbitConfigLoading: false,
        orbitConfigError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  clearOrbitTestResult: () => {
    set({ orbitTestResult: null });
  },
}));
