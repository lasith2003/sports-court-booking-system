// ================================================================
// CourtHub — Booking Zod Schemas
// Client-side validation for booking creation
// ================================================================

import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ── Create Booking Schema ───────────────────────────────────────

export const createBookingSchema = z.object({
  courtId: z
    .string()
    .min(1, 'Court is required'),
  date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z
    .string()
    .min(1, 'Start time is required')
    .regex(TIME_REGEX, 'Start time must be in HH:mm format (e.g. 14:00)'),
  endTime: z
    .string()
    .min(1, 'End time is required')
    .regex(TIME_REGEX, 'End time must be in HH:mm format (e.g. 15:00)'),
});

export type CreateBookingFormData = z.infer<typeof createBookingSchema>;
