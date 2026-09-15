// ================================================================
// CourtHub — Client Providers Wrapper
// Wraps all client-side context providers (Auth, Toast, etc.)
// This is a client component so that RootLayout can remain a
// server component (required for metadata export).
// ================================================================

'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
