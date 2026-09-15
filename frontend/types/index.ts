// ================================================================
// CourtHub — Shared TypeScript Types
// Mirrors the backend Prisma schema + API response shapes
// ================================================================

// ── Enums ──────────────────────────────────────────────────────

export enum Role {
  ADMIN = 'ADMIN',
  VENUE_OWNER = 'VENUE_OWNER',
  CUSTOMER = 'CUSTOMER',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum SportType {
  BADMINTON = 'BADMINTON',
  TENNIS = 'TENNIS',
  FUTSAL = 'FUTSAL',
  BASKETBALL = 'BASKETBALL',
  SQUASH = 'SQUASH',
  CRICKET_NET = 'CRICKET_NET',
}

// ── User ───────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

/** Subset returned inside auth responses (no sensitive fields) */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ── Auth Responses ─────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'CUSTOMER' | 'VENUE_OWNER';
}

// ── Venue ──────────────────────────────────────────────────────

export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  city: string;
  description?: string | null;
  imageUrl?: string | null;
  courts?: Court[];
  owner?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVenuePayload {
  name: string;
  address: string;
  city: string;
  description?: string;
  imageUrl?: string;
}

export interface UpdateVenuePayload {
  name?: string;
  address?: string;
  city?: string;
  description?: string;
  imageUrl?: string;
}

// ── Court ──────────────────────────────────────────────────────

export interface Court {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  pricePerHour: string | number; // Decimal comes as string from Prisma
  openingTime: string;           // "06:00"
  closingTime: string;           // "22:00"
  imageUrl?: string | null;
  venue?: Venue;
  bookings?: Booking[];
  reviews?: Review[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourtPayload {
  name: string;
  sportType: SportType;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
  imageUrl?: string;
}

export interface UpdateCourtPayload {
  name?: string;
  sportType?: SportType;
  pricePerHour?: number;
  openingTime?: string;
  closingTime?: string;
  imageUrl?: string;
}

// ── Court Search & Pagination ──────────────────────────────────

export interface CourtSearchParams {
  sportType?: SportType;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Time Slot (Availability) ───────────────────────────────────

export interface TimeSlot {
  startTime: string; // "06:00"
  endTime: string;   // "07:00"
  isAvailable: boolean;
}

// ── Booking ────────────────────────────────────────────────────

export interface Booking {
  id: string;
  customerId: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalPrice: string | number; // Decimal from Prisma
  court?: Court;
  customer?: User;
  payment?: Payment;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  courtId: string;
  date: string;      // "YYYY-MM-DD"
  startTime: string;  // "HH:mm"
  endTime: string;    // "HH:mm"
}

// ── Payment ────────────────────────────────────────────────────

export interface Payment {
  id: string;
  bookingId: string;
  amount: string | number; // Decimal from Prisma
  status: PaymentStatus;
  method?: string | null;
  createdAt: string;
}

export interface ConfirmPaymentPayload {
  method?: string;
}

// ── Review ─────────────────────────────────────────────────────

export interface Review {
  id: string;
  customerId: string;
  courtId: string;
  rating: number; // 1–5
  comment?: string | null;
  customer?: User;
  createdAt: string;
}

// ── Admin Stats ────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalVenues: number;
  totalCourts: number;
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
  recentBookings: Booking[];
}

// ── API Error Response ─────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
