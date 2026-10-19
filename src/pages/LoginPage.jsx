/**
 * LoginPage — MicroFlat ERP authentication & security screen.
 *
 * Handles 3 modes:
 *   1. 'login'           — Standard username/password authentication
 *   2. 'forgot-password' — Request password reset email + confirmation state
 *   3. 'force-reset'     — Mandatory password change (first-time login or reset token from URL)
 *
 * Layout: split-panel on desktop (branded left, form right),
 *         stacked card on mobile.
 */

import { useState, useEffect, useRef } from 'react';
import {
  IconActivity,
  IconBack,
  IconCheck,
  IconEyeOff,
  IconKeyRound,
  IconLock,
  IconMail,
  IconRuler,
  IconShieldAlert,
  IconShieldCheck,
  IconSuccess,
  IconTarget,
  IconView,
} from '../constants/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { Button, Input, Checkbox, ErrorBanner } from '../components/ui';
import { useAuthContext } from '../context/AuthContext';
import { authService } from '../services';

const LOGO = '/micro-flat-logo.png';

/* ── Validation helpers ───────────────────────────────────────────────────── */
function validateLogin({ identifier, password }) {
  const errors = {};
  if (!identifier.trim()) {
    errors.identifier = 'Email or username is required.';
  } else if (identifier.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
    errors.identifier = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }
  return errors;
}

function validateForgot({ email }) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  return errors;
}

function validateReset({ currentPassword, newPassword, confirmPassword, isTokenReset }) {
  const errors = {};
  if (!isTokenReset && !currentPassword) {
    errors.currentPassword = 'Current password is required.';
  }
  if (!newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (newPassword.length < 6) {
    errors.newPassword = 'Password must be at least 6 characters.';
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

/* ── Blueprint grid background (SVG inline data-URI) ─────────────────────── */
const blueprintGridBg = {
  backgroundImage: `
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cdefs%3E%3Cpattern id='small' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='%230076BA' stroke-width='0.3' stroke-opacity='0.25'/%3E%3C/pattern%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Crect width='60' height='60' fill='url(%23small)'/%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%232E97D9' stroke-width='0.6' stroke-opacity='0.35'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")
  `,
};

/* ── Branded left panel ───────────────────────────────────────────────────── */
function BrandPanel() {
  return (
    <div
      className="hidden lg:flex lg:flex-col lg:justify-between lg:w-[46%] xl:w-[42%] shrink-0 relative overflow-hidden"
      style={{ backgroundColor: 'var(--brand-900)' }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 opacity-100" style={blueprintGridBg} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 30% 40%, var(--brand-700) 0%, transparent 70%)`,
          opacity: 0.45,
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
        <div className="flex flex-col gap-2 mb-auto">
          <div
            className="inline-flex items-center rounded-lg px-3 py-2 self-start"
            style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}
          >
            <img
              src={LOGO}
              alt="Micro-Flat Datums Pvt. Ltd."
              className="h-8 w-auto object-contain"
              draggable={false}
            />
          </div>
        </div>

        <div className="my-auto space-y-6">
          <h1
            className="text-3xl xl:text-4xl font-semibold leading-tight tracking-tight"
            style={{ color: 'white' }}
          >
            Precision in every
            <br />
            measurement.
            <br />
            <span style={{ color: 'var(--brand-300)' }}>Confidence in every decision.</span>
          </h1>
          <p
            className="text-sm leading-relaxed max-w-xs"
            style={{ color: 'var(--brand-200)', opacity: 0.8 }}
          >
            Managing surface-plate manufacturing, NABL-accredited calibration,
            and precision metrology operations since 1978 — now in a single,
            unified platform.
          </p>
        </div>

        <div className="flex gap-8 pt-10 border-t mt-10" style={{ borderColor: 'var(--brand-800)' }}>
          {[
            { icon: <IconRuler size={14} />, value: '45+', label: 'Years of precision' },
            { icon: <IconActivity size={14} />, value: 'NABL', label: 'Accredited lab' },
            { icon: <IconTarget size={14} />, value: '0.001mm', label: 'Tolerance grade' },
          ].map(({ icon, value, label }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5" style={{ color: 'var(--brand-300)' }}>
                {icon}
                <span className="text-lg font-semibold leading-none font-mono tabular-nums" style={{ color: 'white' }}>
                  {value}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--brand-300)', opacity: 0.7 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Authentication Component ────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, changePassword } = useAuthContext();

  // Extract token reset params from URL search
  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';
  const isUrlTokenReset = Boolean(emailParam && tokenParam);

  const tokenResetInfo = useRef({ email: emailParam, token: tokenParam });

  // Mode: 'login' | 'forgot-password' | 'force-reset'
  const mode = location.pathname === '/forgot-password'
    ? 'forgot-password'
    : location.pathname === '/reset-password' || isUrlTokenReset
    ? 'force-reset'
    : 'login';

  // Strip sensitive parameters from address bar on mount if present
  useEffect(() => {
    if (emailParam && tokenParam) {
      tokenResetInfo.current = { email: emailParam, token: tokenParam };
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [emailParam, tokenParam, location.pathname]);

  /* ── Form States ── */
  // 1. Login State
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '', rememberMe: false });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // 2. Forgot Password State
  const [forgotForm, setForgotForm] = useState({ email: '' });
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // 3. Reset / Change Password State
  const [pendingUser, setPendingUser] = useState(null);
  const [resetForm, setResetForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Common UI states
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Mode Switcher ── */
  function switchMode(newMode) {
    setErrors({});
    setFormError('');
    if (newMode === 'login') navigate('/login', { replace: true });
    else if (newMode === 'forgot-password') navigate('/forgot-password', { replace: true });
    else if (newMode === 'force-reset') navigate('/reset-password', { replace: true });
  }

  /* ── Handlers: Login ── */
  function handleLoginChange(e) {
    const { name, value, type, checked } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (formError) setFormError('');
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateLogin(loginForm);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      const { user, mustChangePassword } = await login({
        email: loginForm.identifier,
        password: loginForm.password,
        rememberMe: loginForm.rememberMe,
      });

      if (mustChangePassword) {
        setPendingUser(user);
        setResetForm((prev) => ({ ...prev, currentPassword: loginForm.password }));
        switchMode('force-reset');
        toast('First-time login detected. Please create your permanent password.', {
          icon: '🔒',
        });
        return;
      }

      toast.success(`Welcome back, ${user.firstName || user.name || 'User'}!`);

      // Resolve redirect path (from query or state)
      const params = new URLSearchParams(location.search);
      const returnUrl = params.get('returnUrl') || location.state?.from?.pathname || '/dashboard';
      navigate(returnUrl, { replace: true });
    } catch (err) {
      const msg = err?.message || 'Invalid email or password. Please try again.';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  /* ── Handlers: Forgot Password ── */
  function handleForgotChange(e) {
    setForgotForm({ email: e.target.value });
    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
    if (formError) setFormError('');
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateForgot(forgotForm);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      await authService.forgotPassword({ email: forgotForm.email });
      setForgotSubmitted(true);
      toast.success('If an account exists, password reset instructions have been sent.');
    } catch {
      // Per security requirements, show generic success message even if request fails or account missing
      setForgotSubmitted(true);
      toast.success('If an account exists, password reset instructions have been sent.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Handlers: Password Reset / Change ── */
  function handleResetChange(e) {
    const { name, value } = e.target;
    setResetForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (formError) setFormError('');
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateReset({
      currentPassword: resetForm.currentPassword,
      newPassword: resetForm.newPassword,
      confirmPassword: resetForm.confirmPassword,
      isTokenReset: isUrlTokenReset,
    });

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      if (isUrlTokenReset) {
        // Reset via single-use reset token from email
        await authService.resetPassword({
          email: tokenResetInfo.current.email,
          token: tokenResetInfo.current.token,
          newPassword: resetForm.newPassword,
          confirmPassword: resetForm.confirmPassword,
        });

        toast.success('Password updated successfully! Please sign in with your new password.');
        switchMode('login');
      } else {
        // Change password for signed-in or pending first-time user
        await changePassword({
          currentPassword: resetForm.currentPassword || loginForm.password,
          newPassword: resetForm.newPassword,
          confirmPassword: resetForm.confirmPassword,
        });

        toast.success('Password updated successfully! Welcome to MicroFlat ERP.');
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err?.message || 'Failed to update password. Please check your entries and try again.';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-bg">
      {/* ── Left branded panel (desktop only) ── */}
      <BrandPanel />

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="flex flex-col gap-1.5 mb-8 lg:hidden">
            <div
              className="inline-flex items-center rounded-lg px-3 py-2 self-start"
              style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}
            >
              <img
                src={LOGO}
                alt="Micro-Flat Datums Pvt. Ltd."
                className="h-7 w-auto object-contain"
                draggable={false}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              MODE 1: STANDARD LOGIN FORM
             ══════════════════════════════════════════════════════════════════ */}
          {mode === 'login' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-heading leading-tight">
                  Sign in to your account
                </h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  Enter your credentials to access the ERP portal.
                </p>
              </div>

              <form
                id="login-form"
                onSubmit={handleLoginSubmit}
                noValidate
                aria-label="Login form"
                className="space-y-5"
              >
                <ErrorBanner
                  message={formError}
                  onDismiss={() => setFormError('')}
                />

                <Input
                  id="login-identifier"
                  name="identifier"
                  size="lg"
                  type="text"
                  label="Email or Username"
                  placeholder="admin@microflat.in"
                  autoComplete="username"
                  autoFocus
                  value={loginForm.identifier}
                  onChange={handleLoginChange}
                  error={errors.identifier}
                />

                <Input
                  id="login-password"
                  name="password"
                  size="lg"
                  type={showLoginPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  error={errors.password}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                      className="p-1 rounded text-text-muted hover:text-text transition-colors duration-150"
                    >
                      {showLoginPassword ? (
                        <IconEyeOff size={16} aria-hidden="true" />
                      ) : (
                        <IconView size={16} aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <div className="flex items-center justify-between">
                  <Checkbox
                    id="login-remember-me"
                    label="Remember me"
                    checked={loginForm.rememberMe}
                    onChange={handleLoginChange}
                    name="rememberMe"
                  />
                  <button
                    type="button"
                    id="login-forgot-password"
                    onClick={() => switchMode('forgot-password')}
                    className="text-sm font-medium text-primary hover:text-primary-hover hover:underline transition-colors duration-150 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  id="login-submit"
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE 2: FORGOT PASSWORD FORM
             ══════════════════════════════════════════════════════════════════ */}
          {mode === 'forgot-password' && (
            <div>
              {!forgotSubmitted ? (
                <div>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary transition-colors duration-150 mb-6 cursor-pointer"
                  >
                    <IconBack size={14} aria-hidden="true" />
                    Back to sign in
                  </button>

                  <div className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3.5">
                      <IconKeyRound size={20} aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-semibold text-heading leading-tight">
                      Forgot your password?
                    </h2>
                    <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                      Enter your registered email address and we'll send you instructions to reset your password.
                    </p>
                  </div>

                  <form
                    id="forgot-password-form"
                    onSubmit={handleForgotSubmit}
                    noValidate
                    className="space-y-5"
                  >
                    <ErrorBanner
                      message={formError}
                      onDismiss={() => setFormError('')}
                    />

                    <Input
                      id="forgot-email"
                      name="email"
                      size="lg"
                      type="email"
                      label="Registered Email Address"
                      placeholder="e.g. ian.chesnut@gmail.com"
                      autoFocus
                      value={forgotForm.email}
                      onChange={handleForgotChange}
                      error={errors.email}
                      leftIcon={<IconMail size={16} aria-hidden="true" />}
                    />

                    <Button
                      id="forgot-submit"
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={loading}
                      disabled={loading}
                    >
                      {loading ? 'Sending link…' : 'Send Reset Link'}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-4">
                    <IconSuccess size={30} aria-hidden="true" />
                  </div>

                  <h3 className="text-xl font-bold text-heading">
                    Check your email
                  </h3>
                  <p className="text-sm text-text-muted mt-2 leading-relaxed max-w-sm mx-auto">
                    If an account is associated with{' '}
                    <span className="font-semibold text-heading font-mono">{forgotForm.email}</span>,
                    password reset instructions have been dispatched.
                  </p>

                  <div className="mt-8 space-y-3">
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      onClick={() => {
                        setForgotSubmitted(false);
                        switchMode('login');
                      }}
                    >
                      Back to sign in
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE 3: PASSWORD RESET / CHANGE
             ══════════════════════════════════════════════════════════════════ */}
          {mode === 'force-reset' && (
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20 text-xs font-semibold mb-3">
                  <IconShieldAlert size={14} aria-hidden="true" />
                  {isUrlTokenReset ? 'Password Reset' : 'Mandatory Password Change'}
                </div>

                <h2 className="text-2xl font-semibold text-heading leading-tight">
                  {isUrlTokenReset ? 'Set your new password' : 'Change temporary password'}
                </h2>
                <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                  {isUrlTokenReset
                    ? 'Enter your new permanent password below to complete the reset.'
                    : 'Your account requires a new password before you can proceed.'}
                </p>
              </div>

              {pendingUser && (
                <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {(pendingUser?.firstName || 'U').charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-heading leading-tight">
                        {pendingUser?.firstName} {pendingUser?.lastName}
                      </p>
                      <p className="text-2xs text-text-muted font-mono leading-tight mt-0.5">
                        {pendingUser?.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {pendingUser?.primaryRole || 'User'}
                  </span>
                </div>
              )}

              <form
                id="reset-password-form"
                onSubmit={handleResetSubmit}
                noValidate
                className="space-y-4"
              >
                <ErrorBanner
                  message={formError}
                  onDismiss={() => setFormError('')}
                />

                {!isUrlTokenReset && (
                  <Input
                    id="reset-current-password"
                    name="currentPassword"
                    size="lg"
                    type={showCurrentPassword ? 'text' : 'password'}
                    label="Current Password"
                    placeholder="Enter current / temporary password"
                    value={resetForm.currentPassword}
                    onChange={handleResetChange}
                    error={errors.currentPassword}
                    leftIcon={<IconLock size={16} aria-hidden="true" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((v) => !v)}
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        tabIndex={0}
                        className="p-1 rounded text-text-muted hover:text-text transition-colors duration-150"
                      >
                        {showCurrentPassword ? (
                          <IconEyeOff size={16} aria-hidden="true" />
                        ) : (
                          <IconView size={16} aria-hidden="true" />
                        )}
                      </button>
                    }
                  />
                )}

                <Input
                  id="reset-new-password"
                  name="newPassword"
                  size="lg"
                  type={showNewPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="At least 6 characters"
                  autoFocus={isUrlTokenReset}
                  value={resetForm.newPassword}
                  onChange={handleResetChange}
                  error={errors.newPassword}
                  leftIcon={<IconLock size={16} aria-hidden="true" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                      className="p-1 rounded text-text-muted hover:text-text transition-colors duration-150"
                    >
                      {showNewPassword ? (
                        <IconEyeOff size={16} aria-hidden="true" />
                      ) : (
                        <IconView size={16} aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <Input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  size="lg"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  value={resetForm.confirmPassword}
                  onChange={handleResetChange}
                  error={errors.confirmPassword}
                  leftIcon={<IconShieldCheck size={16} aria-hidden="true" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                      className="p-1 rounded text-text-muted hover:text-text transition-colors duration-150"
                    >
                      {showConfirmPassword ? (
                        <IconEyeOff size={16} aria-hidden="true" />
                      ) : (
                        <IconView size={16} aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                <div className="p-3 bg-surface/70 rounded-lg border border-border/80 space-y-1.5 text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        resetForm.newPassword.length >= 6
                          ? 'bg-success text-white'
                          : 'bg-border text-transparent'
                      }`}
                    >
                      <IconCheck size={10} strokeWidth={3} />
                    </div>
                    <span>Minimum 6 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        resetForm.newPassword &&
                        resetForm.newPassword === resetForm.confirmPassword
                          ? 'bg-success text-white'
                          : 'bg-border text-transparent'
                      }`}
                    >
                      <IconCheck size={10} strokeWidth={3} />
                    </div>
                    <span>Passwords match</span>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    id="force-reset-submit"
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={loading}
                  >
                    {loading ? 'Updating password…' : 'Update Password & Continue'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={() => switchMode('login')}
                    className="text-xs text-text-muted hover:text-heading"
                  >
                    Cancel and return to sign in
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Footer */}
          <p className="mt-10 text-xs text-text-muted text-center">
            © {new Date().getFullYear()} Micro-Flat Datums Pvt. Ltd. · NABL
            accredited precision metrology.
          </p>
        </div>
      </div>
    </div>
  );
}
