// ================================================================
// CourtHub — Axios API Client
// Base URL, JWT interceptors, auto-refresh, typed API methods
// ================================================================

import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  setStoredUser,
} from './auth';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  Venue,
  CreateVenuePayload,
  UpdateVenuePayload,
  Court,
  CreateCourtPayload,
  UpdateCourtPayload,
  CourtSearchParams,
  PaginatedResponse,
  TimeSlot,
  Booking,
  CreateBookingPayload,
  Payment,
  AdminStats,
  User,
} from '@/types';

// ── Axios Instance ──────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ── Request Interceptor — Attach Bearer Token ───────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor — Auto-Refresh on 401 ─────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401 errors, not on auth endpoints themselves
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint with the refresh token
        const { data } = await axios.post<AuthResponse>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          },
        );

        // Save new tokens
        setTokens(data.accessToken, data.refreshToken);
        setStoredUser(data.user);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        }

        processQueue(null, data.accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ================================================================
// Typed API Methods
// ================================================================

// ── Auth ─────────────────────────────────────────────────────────

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post<AuthResponse>('/auth/refresh'),
};

// ── Users ────────────────────────────────────────────────────────

export const usersApi = {
  getMe: () => api.get<User>('/users/me'),

  getAll: () => api.get<User[]>('/users'),

  updateRole: (userId: string, role: string) =>
    api.patch<User>(`/users/${userId}/role`, { role }),
};

// ── Venues ───────────────────────────────────────────────────────

export const venuesApi = {
  getAll: () => api.get<Venue[]>('/venues'),

  getOne: (id: string) => api.get<Venue>(`/venues/${id}`),

  create: (payload: CreateVenuePayload) =>
    api.post<Venue>('/venues', payload),

  update: (id: string, payload: UpdateVenuePayload) =>
    api.patch<Venue>(`/venues/${id}`, payload),

  delete: (id: string) => api.delete(`/venues/${id}`),
};

// ── Courts ───────────────────────────────────────────────────────

export const courtsApi = {
  search: (params: CourtSearchParams = {}) =>
    api.get<PaginatedResponse<Court>>('/courts', { params }),

  getOne: (id: string) => api.get<Court>(`/courts/${id}`),

  getAvailability: (courtId: string, date: string) =>
    api.get<TimeSlot[]>(`/courts/${courtId}/availability`, {
      params: { date },
    }),

  create: (venueId: string, payload: CreateCourtPayload) =>
    api.post<Court>(`/venues/${venueId}/courts`, payload),

  update: (id: string, payload: UpdateCourtPayload) =>
    api.patch<Court>(`/courts/${id}`, payload),

  delete: (id: string) => api.delete(`/courts/${id}`),
};

// ── Bookings ─────────────────────────────────────────────────────

export const bookingsApi = {
  create: (payload: CreateBookingPayload) =>
    api.post<Booking>('/bookings', payload),

  getMine: () => api.get<Booking[]>('/bookings/me'),

  getByVenue: (venueId: string) =>
    api.get<Booking[]>(`/bookings/venue/${venueId}`),

  cancel: (id: string) => api.patch<Booking>(`/bookings/${id}/cancel`),

  confirm: (id: string) => api.patch<Booking>(`/bookings/${id}/confirm`),

  getAll: () => api.get<Booking[]>('/bookings'),
};

// ── Payments ─────────────────────────────────────────────────────

export const paymentsApi = {
  confirm: (bookingId: string, method?: string) =>
    api.post<Payment>(`/payments/${bookingId}/confirm`, { method }),

  getByBooking: (bookingId: string) =>
    api.get<Payment>(`/payments/${bookingId}`),
};

// ── Admin ────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),

  getUsers: () => api.get<User[]>('/admin/users'),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  getVenues: () => api.get<Venue[]>('/admin/venues'),

  deleteVenue: (id: string) => api.delete(`/admin/venues/${id}`),

  getBookings: () => api.get<Booking[]>('/admin/bookings'),

  cancelBooking: (id: string) =>
    api.patch<Booking>(`/admin/bookings/${id}/cancel`),
};

// ── Default Export ───────────────────────────────────────────────

export default api;
