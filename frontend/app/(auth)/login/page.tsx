// ================================================================
// CourtHub — Login Page
// JWT login form with email/password, Zod validation, react-hook-form
// ================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { loginSchema, type LoginFormData } from '@/lib/validators/auth.schema';
import type { ApiError } from '@/types';
import { AxiosError } from 'axios';
import styles from '../auth.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.message;
      setApiError(
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
            ? msg[0]
            : 'Login failed. Please check your credentials.',
      );
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* ── Logo ── */}
        <div className={styles.authLogo}>
          <div className={styles.authLogoIcon}>
            <Zap size={22} />
          </div>
          <span className={styles.authLogoText}>CourtHub</span>
        </div>

        {/* ── Header ── */}
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Welcome back</h1>
          <p className={styles.authSubtitle}>
            Sign in to your account to book courts
          </p>
        </div>

        {/* ── API Error ── */}
        {apiError && (
          <div className={styles.apiError}>
            <AlertCircle size={16} />
            {apiError}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.authForm}>
          {/* Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email Address
            </label>
            <div className={styles.formInputWrapper}>
              <Mail size={18} className={styles.formInputIcon} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className={`${styles.formInput} ${errors.email ? styles.hasError : ''}`}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <span className={styles.formError}>
                <AlertCircle size={12} />
                {errors.email.message}
              </span>
            )}
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <div className={styles.formInputWrapper}>
              <Lock size={18} className={styles.formInputIcon} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`${styles.formInput} ${errors.password ? styles.hasError : ''}`}
                {...register('password')}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.formError}>
                <AlertCircle size={12} />
                {errors.password.message}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.submitBtn}
          >
            {isSubmitting ? (
              <div className={styles.btnSpinner} />
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className={styles.authFooter}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className={styles.authFooterLink}>
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
