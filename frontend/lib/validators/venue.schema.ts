// ================================================================
// CourtHub — Venue & Court Zod Schemas
// Client-side validation for venue/court creation & update forms
// ================================================================

import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const SPORT_TYPES = [
  'BADMINTON',
  'TENNIS',
  'FUTSAL',
  'BASKETBALL',
  'SQUASH',
  'CRICKET_NET',
] as const;

// ── Create Venue Schema ─────────────────────────────────────────

export const createVenueSchema = z.object({
  name: z
    .string()
    .min(1, 'Venue name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(200, 'Address must be at most 200 characters'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(50, 'City must be at most 50 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  imageUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});

export type CreateVenueFormData = z.infer<typeof createVenueSchema>;

// ── Update Venue Schema (all fields optional) ───────────────────

export const updateVenueSchema = createVenueSchema.partial();

export type UpdateVenueFormData = z.infer<typeof updateVenueSchema>;

// ── Create Court Schema ─────────────────────────────────────────

export const createCourtSchema = z.object({
  name: z
    .string()
    .min(1, 'Court name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  sportType: z.enum(SPORT_TYPES, {
    message: 'Please select a sport type',
  }),
  pricePerHour: z
    .number({ error: 'Price must be a number' })
    .min(1, 'Price must be at least 1')
    .max(100000, 'Price must be at most 100,000'),
  openingTime: z
    .string()
    .min(1, 'Opening time is required')
    .regex(TIME_REGEX, 'Opening time must be in HH:mm format'),
  closingTime: z
    .string()
    .min(1, 'Closing time is required')
    .regex(TIME_REGEX, 'Closing time must be in HH:mm format'),
  imageUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});

export type CreateCourtFormData = z.infer<typeof createCourtSchema>;

// ── Update Court Schema (all fields optional) ───────────────────

export const updateCourtSchema = createCourtSchema.partial();

export type UpdateCourtFormData = z.infer<typeof updateCourtSchema>;
