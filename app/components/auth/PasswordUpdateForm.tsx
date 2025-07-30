import { useState, useEffect } from 'react';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';

interface PasswordUpdateFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function PasswordUpdateForm({ onSuccess, onError }: PasswordUpdateFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [disabled, setDisabled] = useState(true);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      onError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      onError('Password must be at least 6 characters long');
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await getSupabase().auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      onSuccess('Password updated successfully! You are now signed in.');
    } catch (error) {
      const authError = error as AuthError;
      onError(authError.message || 'Failed to update password');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    setDisabled(password === '' || confirmPassword === '' || password.length < 6 || password !== confirmPassword);
  }, [password, confirmPassword]);

  return (
    <>
      <div className="text-center mb-8">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <circle cx="12" cy="16" r="1" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-bolt-elements-textPrimary">Set New Password</h2>
        <p className="text-bolt-elements-textSecondary">Please enter your new password below.</p>
      </div>

      <form onSubmit={handlePasswordUpdate}>
        <div className="mb-4">
          <label htmlFor="new-password" className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter your new password"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="confirm-new-password"
            className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary"
          >
            Confirm New Password
          </label>
          <input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Confirm your new password"
            required
          />
        </div>

        {password !== '' && confirmPassword !== '' && password !== confirmPassword && (
          <div className="mb-4 text-sm text-red-500">Passwords do not match</div>
        )}

        {password !== '' && password.length < 6 && (
          <div className="mb-4 text-sm text-red-500">Password must be at least 6 characters long</div>
        )}

        <button
          type="submit"
          disabled={isProcessing || disabled}
          className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          {isProcessing ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>
    </>
  );
}
