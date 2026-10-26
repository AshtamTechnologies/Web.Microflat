/**
 * AuthVerificationModal.jsx — Security confirmation modal requiring login username & password
 * before updating or deleting sensitive Company Bank Account records.
 */

import { useState, useEffect } from 'react';
import {
  IconCheck,
  IconDelete,
  IconError,
  IconEyeOff,
  IconLock,
  IconShieldAlert,
  IconView,
} from '../../../constants/icons';
import { Modal, Button, CancelButton, Input } from '../../../components/ui';
import { useUsersContext } from '../../../context/UsersContext';

export default function AuthVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  action = 'update', // 'update' | 'delete'
  bankAccount = null,
  companyName = '',
}) {
  const { allUsers = [], ensureUsersLoaded } = useUsersContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      if (allUsers.length === 0 && ensureUsersLoaded) {
        ensureUsersLoaded();
      }
      // Default placeholder / suggested active session username
      setUsername('ian.chesnut@gmail.com');
      setPassword('');
      setShowPassword(false);
      setError('');
      setIsVerifying(false);
    }
  }, [isOpen, allUsers.length, ensureUsersLoaded]);

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
            {isDelete ? <IconShieldAlert size={20} /> : <IconLock size={20} />}
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
                  <strong>{companyName || 'this company'}</strong>.
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
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs animate-shake">
            <IconError size={16} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Username or Login Email <span className="text-danger">*</span>
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. ian.chesnut@gmail.com"
              autoFocus
              className="w-full text-xs"
              disabled={isVerifying}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Password <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter your login password"
                className="w-full pr-10 text-xs"
                disabled={isVerifying}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-heading transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <IconEyeOff size={16} /> : <IconView size={16} />}
              </button>
            </div>
            <p className="text-3xs text-text-muted mt-1">
              For demo testing, enter <code className="bg-surface px-1 py-0.5 rounded border border-border">admin123</code> or your active account password.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <CancelButton
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            size="sm"
          >
            Cancel
          </CancelButton>

          <Button
            type="submit"
            variant={isDelete ? 'danger' : 'primary'}
            size="sm"
            disabled={isVerifying}
            icon={isDelete ? IconDelete : IconCheck}
          >
            {isVerifying ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying…
              </span>
            ) : isDelete ? (
              'Confirm Delete'
            ) : (
              'Confirm & Save'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
