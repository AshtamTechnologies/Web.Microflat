/**
 * AuthVerificationModal.jsx — Security confirmation modal requiring login username & password
 * before updating or deleting sensitive Vendor Bank Account records.
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
import { vendorService } from '../../../services';

export default function AuthVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  action = 'update', // 'update' | 'delete'
  bankAccount = null,
  vendorName = '',
  vendorId = '',
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setError('');
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDelete = action === 'delete';

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const p = password.trim();

    if (!p) {
      setError('Please enter your login password.');
      return;
    }

    const targetVendorId = vendorId || bankAccount?.vendorId;
    if (!targetVendorId) {
      setError('Vendor ID not found. Cannot authorize bank update.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const authResult = await vendorService.authenticateVendorBank(targetVendorId, p);
      setIsVerifying(false);
      onSuccess(authResult);
      onClose();
    } catch (err) {
      setIsVerifying(false);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Invalid password. Authorization failed. Please verify credentials.';
      setError(errMsg);
    }
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
            <IconError size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Credential Inputs */}
        <div className="space-y-3 pt-1">
          <div>
            <Input
              id="auth-login-password"
              name="password"
              label="Login Password"
              required
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your login password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              error={error}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-text-muted hover:text-heading p-1 rounded cursor-pointer transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconView size={16} />}
                </button>
              }
            />
            <p className="text-2xs text-text-muted mt-1.5">
              Confirm your user password to authorize bank detail modification.
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
                <IconDelete size={14} />
                <span>Verify & Delete</span>
              </>
            ) : (
              <>
                <IconCheck size={14} />
                <span>Verify & Update</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
