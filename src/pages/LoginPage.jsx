/**
 * LoginPage — MicroFlat ERP authentication & security screen.
 *
 * Handles 3 modes:
 *   1. 'login'           — Standard username/password authentication
 *   2. 'forgot-password' — Request password reset email + confirmation state
 *   3. 'force-reset'     — Mandatory password reset on first-time login
 *
 * Layout: split-panel on desktop (branded left, form right),
 *         stacked card on mobile.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Ruler,
  Activity,
  Target,
  ArrowLeft,
  Mail,
  Lock,
  KeyRound,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button, Input, Checkbox, ErrorBanner } from '../components/ui';
import { login, forgotPassword, forceResetPassword } from '../services/authService';

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

function validateForceReset({ newPassword, confirmPassword }) {
  const errors = {};
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
      {/* Blueprint grid texture */}
      <div className="absolute inset-0 opacity-100" style={blueprintGridBg} />

      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 30% 40%, var(--brand-700) 0%, transparent 70%)`,
          opacity: 0.45,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
        {/* Logo */}
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
          {/* <div
            className="text-xs leading-tight tracking-widest uppercase pl-1"
            style={{ color: 'var(--brand-300)', opacity: 0.85 }}
          >
            ERP System
          </div> */}
        </div>

        {/* Hero text */}
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

        {/* Stats row */}
        <div className="flex gap-8 pt-10 border-t mt-10" style={{ borderColor: 'var(--brand-800)' }}>
          {[
            { icon: <Ruler size={14} strokeWidth={1.5} />, value: '45+', label: 'Years of precision' },
            { icon: <Activity size={14} strokeWidth={1.5} />, value: 'NABL', label: 'Accredited lab' },
            { icon: <Target size={14} strokeWidth={1.5} />, value: '0.001mm', label: 'Tolerance grade' },
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
export default function LoginPage({ initialMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'forgot-password' | 'force-reset'
  const [mode, setMode] = useState(() => {
    if (location.pathname === '/forgot-password') return 'forgot-password';
    if (location.pathname === '/reset-password') return 'force-reset';
    return initialMode;
  });

  // Keep mode in sync with URL
  useEffect(() => {
    if (location.pathname === '/forgot-password') setMode('forgot-password');
    else if (location.pathname === '/reset-password') setMode('force-reset');
    else if (location.pathname === '/login') setMode('login');
  }, [location.pathname]);

  /* ── Form States ── */
  // 1. Login State
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '', rememberMe: false });
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // 2. Forgot Password State
  const [forgotForm, setForgotForm] = useState({ email: '' });
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // 3. Force Reset State (First Time Login)
  const [pendingUser, setPendingUser] = useState(null);
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Common UI states
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── Mode Switcher ── */
  function switchMode(newMode) {
    setMode(newMode);
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

  function handleFillDemo(identifier, password) {
    setLoginForm((prev) => ({ ...prev, identifier, password }));
    setErrors({});
    setFormError('');
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
      const response = await login({
        identifier: loginForm.identifier,
        password: loginForm.password,
      });
      const { token, user } = response.data;

      // Check if user requires mandatory password reset on first login
      if (user.isFirstLogin) {
        setPendingUser({ ...user, tempToken: token });
        switchMode('force-reset');
        toast('First-time login detected. Please create your permanent password.', {
          icon: '🔒',
        });
        return;
      }

      // Normal Login Success
      if (loginForm.rememberMe) {
        localStorage.setItem('mf-token', token);
      } else {
        sessionStorage.setItem('mf-token', token);
      }
      toast.success(`Welcome back, ${user.name || 'User'}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Invalid credentials. Please try again.';
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
      await forgotPassword({ email: forgotForm.email });
      setForgotSubmitted(true);
      toast.success('Password reset link sent to your email.');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Unable to send reset instructions. Please check the email and try again.';
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  /* ── Handlers: Force Password Reset (First Login) ── */
  function handleResetChange(e) {
    const { name, value } = e.target;
    setResetForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (formError) setFormError('');
  }

  async function handleForceResetSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateForceReset(resetForm);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    setFormError('');

    const email = pendingUser?.email || loginForm.identifier || 'admin@microflat.in';

    try {
      const response = await forceResetPassword({
        email,
        newPassword: resetForm.newPassword,
      });

      const token = response.data?.token || pendingUser?.tempToken || 'stub-jwt-token';
      if (loginForm.rememberMe) {
        localStorage.setItem('mf-token', token);
      } else {
        sessionStorage.setItem('mf-token', token);
      }

      toast.success('Password set successfully! Welcome to MicroFlat ERP.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Failed to update password. Please try again.';
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
            {/* <span className="text-xs text-text-muted tracking-widest uppercase pl-0.5">
              ERP System
            </span> */}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              MODE 1: STANDARD LOGIN FORM
             ══════════════════════════════════════════════════════════════════ */}
          {mode === 'login' && (
            <div>
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-heading leading-tight">
                  Sign in to your account
                </h2>
                <p className="mt-1.5 text-sm text-text-muted">
                  Enter your credentials to access the ERP portal.
                </p>
              </div>

              {/* Form */}
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

                {/* Email / username */}
                <Input
                  id="login-identifier"
                  name="identifier"
                  type="text"
                  label="Email or Username"
                  placeholder="admin@microflat.in"
                  autoComplete="username"
                  autoFocus
                  value={loginForm.identifier}
                  onChange={handleLoginChange}
                  error={errors.identifier}
                />

                {/* Password */}
                <Input
                  id="login-password"
                  name="password"
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
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                {/* Remember me + forgot password button */}
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

                {/* Submit */}
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

                {/* Demo helper pills */}
                <div className="pt-2 border-t border-border/70 space-y-2">
                  <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider text-center select-none">
                    Demo Credentials (Click to test)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleFillDemo('admin@microflat.in', 'admin123')}
                      className="p-2 rounded-lg border border-border bg-surface/60 hover:bg-surface hover:border-primary/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-heading">Standard User</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Direct</span>
                      </div>
                      <p className="text-[11px] font-mono text-text-muted mt-0.5">admin@microflat.in</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFillDemo('newuser@microflat.in', 'welcome123')}
                      className="p-2 rounded-lg border border-border bg-surface/60 hover:bg-surface hover:border-warning/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-heading">First-Time User</span>
                        <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded font-medium">Force Reset</span>
                      </div>
                      <p className="text-[11px] font-mono text-text-muted mt-0.5">newuser@microflat.in</p>
                    </button>
                  </div>
                </div>
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
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary transition-colors duration-150 mb-6 cursor-pointer"
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    Back to sign in
                  </button>

                  {/* Header */}
                  <div className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3.5">
                      <KeyRound size={20} aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-semibold text-heading leading-tight">
                      Forgot your password?
                    </h2>
                    <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                      Enter your registered email address and we'll send you instructions to reset your password.
                    </p>
                  </div>

                  {/* Form */}
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
                      type="email"
                      label="Registered Email Address"
                      placeholder="e.g. ian.chesnut@gmail.com"
                      autoFocus
                      value={forgotForm.email}
                      onChange={handleForgotChange}
                      error={errors.email}
                      leftIcon={<Mail size={16} aria-hidden="true" />}
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
                /* Success Confirmation */
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={30} aria-hidden="true" />
                  </div>

                  <h3 className="text-xl font-bold text-heading">
                    Check your email
                  </h3>
                  <p className="text-sm text-text-muted mt-2 leading-relaxed max-w-sm mx-auto">
                    We've sent a password reset link to{' '}
                    <span className="font-semibold text-heading font-mono">{forgotForm.email}</span>.
                    Please check your inbox and follow the instructions.
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

                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={handleForgotSubmit}
                      disabled={loading}
                      className="text-xs text-text-muted hover:text-heading"
                    >
                      Didn't receive an email? Click to resend
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MODE 3: FORCED PASSWORD RESET (FIRST-TIME LOGIN)
             ══════════════════════════════════════════════════════════════════ */}
          {mode === 'force-reset' && (
            <div>
              {/* Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20 text-xs font-semibold mb-3">
                  <ShieldAlert size={14} aria-hidden="true" />
                  First-Time Sign In Security
                </div>

                <h2 className="text-2xl font-semibold text-heading leading-tight">
                  Set your new password
                </h2>
                <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                  Welcome to MicroFlat ERP! For account safety, please set a new permanent password before proceeding.
                </p>
              </div>

              {/* User badge */}
              <div className="p-3 rounded-lg bg-surface border border-border flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {(pendingUser?.name || 'U').charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-heading leading-tight">
                      {pendingUser?.name || 'Authorized User'}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono leading-tight mt-0.5">
                      {pendingUser?.email || loginForm.identifier || 'user@microflat.in'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {pendingUser?.role || 'User'}
                </span>
              </div>

              {/* Form */}
              <form
                id="force-reset-form"
                onSubmit={handleForceResetSubmit}
                noValidate
                className="space-y-4"
              >
                <ErrorBanner
                  message={formError}
                  onDismiss={() => setFormError('')}
                />

                {/* New Password */}
                <Input
                  id="reset-new-password"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="At least 6 characters"
                  autoFocus
                  value={resetForm.newPassword}
                  onChange={handleResetChange}
                  error={errors.newPassword}
                  leftIcon={<Lock size={16} aria-hidden="true" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                      className="p-1 rounded text-text-muted hover:text-text transition-colors duration-150"
                    >
                      {showNewPassword ? (
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                {/* Confirm Password */}
                <Input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  value={resetForm.confirmPassword}
                  onChange={handleResetChange}
                  error={errors.confirmPassword}
                  leftIcon={<ShieldCheck size={16} aria-hidden="true" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                      className="p-1 rounded text-text-muted hover:text-text transition-colors duration-150"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} aria-hidden="true" />
                      ) : (
                        <Eye size={16} aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                {/* Password Criteria Checklist */}
                <div className="p-3 bg-surface/70 rounded-lg border border-border/80 space-y-1.5 text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                        resetForm.newPassword.length >= 6
                          ? 'bg-success text-white'
                          : 'bg-border text-transparent'
                      }`}
                    >
                      <Check size={10} strokeWidth={3} />
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
                      <Check size={10} strokeWidth={3} />
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
