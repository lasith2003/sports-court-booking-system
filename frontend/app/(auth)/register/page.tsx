// ================================================================
// CourtHub — Register Page
// Registration form with name, email, password, role selector
// ================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  UserPlus,
  Zap,
  AlertCircle,
  Users,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  registerSchema,
  type RegisterFormData,
} from '@/lib/validators/auth.schema';
import type { ApiError } from '@/types';
import { AxiosError } from 'axios';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'CUSTOMER',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      // Don't send confirmPassword to backend
      await authRegister({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.message;
      setApiError(
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
            ? msg[0]
            : 'Registration failed. Please try again.',
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
          <h1 className={styles.authTitle}>Create your account</h1>
          <p className={styles.authSubtitle}>
            Join CourtHub and start booking courts today
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
          {/* Name */}
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              Full Name
            </label>
            <div className={styles.formInputWrapper}>
              <User size={18} className={styles.formInputIcon} />
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                className={`${styles.formInput} ${errors.name ? styles.hasError : ''}`}
                {...register('name')}
              />
            </div>
            {errors.name && (
              <span className={styles.formError}>
                <AlertCircle size={12} />
                {errors.name.message}
              </span>
            )}
          </div>

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
                placeholder="Min. 8 characters"
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              Confirm Password
            </label>
            <div className={styles.formInputWrapper}>
              <Lock size={18} className={styles.formInputIcon} />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Retype your password"
                autoComplete="new-password"
                className={`${styles.formInput} ${errors.confirmPassword ? styles.hasError : ''}`}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className={styles.formError}>
                <AlertCircle size={12} />
                {errors.confirmPassword.message}
              </span>
            )}
          </div>

          {/* Role Selector */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>I want to</label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <div className={styles.roleSelector}>
                  {/* Customer */}
                  <label
                    className={`${styles.roleOption} ${field.value === 'CUSTOMER' ? styles.active : ''}`}
                  >
                    <input
                      type="radio"
                      value="CUSTOMER"
                      checked={field.value === 'CUSTOMER'}
                      onChange={() => field.onChange('CUSTOMER')}
                      className={styles.roleHiddenInput}
                    />
                    <Users size={24} className={styles.roleOptionIcon} />
                    <span className={styles.roleOptionLabel}>Book Courts</span>
                    <span className={styles.roleOptionDesc}>
                      Find &amp; reserve sports courts
                    </span>
                  </label>

                  {/* Venue Owner */}
                  <label
                    className={`${styles.roleOption} ${field.value === 'VENUE_OWNER' ? styles.active : ''}`}
                  >
                    <input
                      type="radio"
                      value="VENUE_OWNER"
                      checked={field.value === 'VENUE_OWNER'}
                      onChange={() => field.onChange('VENUE_OWNER')}
                      className={styles.roleHiddenInput}
                    />
                    <Building2 size={24} className={styles.roleOptionIcon} />
                    <span className={styles.roleOptionLabel}>List Venues</span>
                    <span className={styles.roleOptionDesc}>
                      Manage &amp; rent out courts
                    </span>
                  </label>
                </div>
              )}
            />
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
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className={styles.authFooter}>
          Already have an account?{' '}
          <Link href="/login" className={styles.authFooterLink}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
