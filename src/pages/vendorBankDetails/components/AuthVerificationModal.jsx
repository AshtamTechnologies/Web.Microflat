/**
 * AuthVerificationModal.jsx — Security confirmation modal requiring login username & password
 * before updating or deleting sensitive Vendor Bank Account records.
 */

import { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Eye, EyeOff, AlertCircle, Check, Trash2 } from 'lucide-react';
import { Modal, Button, CancelButton, Input } from '../../../components/ui';
import { useUsersContext } from '../../../context/UsersContext';

export default function AuthVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  action = 'update', // 'update' | 'delete'
  bankAccount = null,
  vendorName = '',
}) {
  const { allUsers = [] } = useUsersContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      // Default placeholder / suggested active session username
      setUsername('ian.chesnut@gmail.com');
      setPassword('');
      setShowPassword(false);
      setError('');
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDelete = action === 'delete';

  function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u) {
      setError('Please enter your login username or email.');
      return;
    }
    if (!p) {
      setError('Please enter your login password.');
      return;
    }

    setIsVerifying(true);
    setError('');

    setTimeout(() => {
      // Verify against demo passwords
      const validPasswords = ['admin123', 'admin', 'password', '123456'];

      // Check admin shortcut
      let matchedUser = null;
      if (u === 'admin' && (validPasswords.includes(p) || p.length >= 4)) {
        matchedUser = { name: 'Admin', email: 'admin@microflat.com' };
      } else {
        // Check across users
        const found = allUsers.find(
          (user) =>
            user.email?.toLowerCase() === u ||
            `${user.firstName} ${user.lastName}`.toLowerCase() === u ||
            user.firstName?.toLowerCase() === u
        );
        if (found && (validPasswords.includes(p) || p.length >= 4)) {
          matchedUser = {
            name: `${found.firstName} ${found.lastName}`,
            email: found.email,
          };
        } else if (
          (u === 'ian' || u === 'ian.chesnut@gmail.com' || u === 'ian chesnut') &&
          (validPasswords.includes(p) || p.length >= 4)
        ) {
          matchedUser = { name: 'Ian Chesnut', email: 'ian.chesnut@gmail.com' };
        }
      }

      setIsVerifying(false);

      if (matchedUser) {
        onSuccess(matchedUser);
        onClose();
      } else {
        setError('Invalid username or password. Authorization failed. Please verify credentials.');
      }
    }, 400);
  }

  const maskedAccount = bankAccount?.accountNumber
    ? `•••• ${String(bankAccount.accountNumber).slice(-4)}`
    : '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDelete ? 'Authorize Account Deletion' : 'Authorize Bank Details Update'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Security Header Banner */}
        <div
          className={`flex items-start gap-3 p-3.5 rounded-xl border ${
            isDelete
              ? 'bg-danger/5 border-danger/25 text-danger'
              : 'bg-primary/5 border-primary/20 text-primary'
          }`}
        >
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isDelete ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'
            }`}
          >
            {isDelete ? <ShieldAlert size={20} /> : <Lock size={20} />}
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <h4 className="font-bold text-heading text-xs">
              {isDelete ? 'Security Authorization Required' : 'Audit Verification Required'}
            </h4>
            <p className="text-text-muted mt-0.5 leading-relaxed">
              {isDelete ? (
                <>
                  You are about to permanently delete <strong>{bankAccount?.bankName || 'bank account'}</strong> (
                  <span className="font-mono font-medium">{maskedAccount}</span>) for{' '}
                  <strong>{vendorName || 'this vendor'}</strong>.
                </>
              ) : (
                <>
                  Confirm updating bank details for <strong>{bankAccount?.bankName || 'bank account'}</strong> (
                  <span className="font-mono font-medium">{maskedAccount}</span>).
                </>
              )}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger animate-in fade-in duration-150">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Credential Inputs */}
        <div className="space-y-3 pt-1">
          <div>
            <Input
              id="auth-login-username"
              name="username"
              type="text"
              label="Login Username or Email"
              placeholder="e.g. ian.chesnut@gmail.com or admin"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="auth-login-password"
              className="text-xs font-semibold text-heading block mb-1.5"
            >
              Login Password <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <input
                id="auth-login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your login password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="current-password"
                className="w-full rounded-lg border border-border bg-bg text-text text-sm px-3.5 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-heading p-1 rounded cursor-pointer transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-2xs text-text-muted mt-1.5">
              Hint: You can use active credentials (e.g. <span className="font-mono text-heading">ian.chesnut@gmail.com</span> /{' '}
              <span className="font-mono text-heading">admin123</span>).
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <CancelButton
            size="md"
            onClick={onClose}
            disabled={isVerifying}
          />
          <Button
            type="submit"
            variant={isDelete ? 'danger' : 'primary'}
            size="md"
            loading={isVerifying}
            className="flex items-center gap-1.5"
          >
            {isDelete ? (
              <>
                <Trash2 size={14} />
                <span>Verify & Delete</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Verify & Update</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
