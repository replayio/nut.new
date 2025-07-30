import { useState, useEffect } from 'react';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';

interface PasswordResetFormProps {
  onBack: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
};

export function PasswordResetForm({ onBack, onSuccess, onError }: PasswordResetFormProps) {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      onSuccess('Password reset link sent! Check your email for instructions.');
    } catch (error) {
      const authError = error as AuthError;
      onError(authError.message || 'Failed to send password reset email');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const emailValid = email === '' || validateEmail(email);
    setIsEmailValid(emailValid);
    setDisabled(email === '' || !emailValid);
  }, [email]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Reset Your Password</h2>

      <p className="text-center text-bolt-elements-textSecondary mb-6">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handlePasswordReset}>
        <div className="mb-6">
          <label htmlFor="reset-email" className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
            Email Address
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter your email address"
            required
          />
          {email !== '' && !isEmailValid && (
            <div className="mt-2 text-sm text-red-500">Please enter a valid email address</div>
          )}
        </div>

        <button
          type="submit"
          disabled={isProcessing || disabled}
          className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          {isProcessing ? 'Sending Reset Link...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-6 text-center text-bolt-elements-textSecondary">
        Remember your password?{' '}
        <button onClick={onBack} className="text-green-500 hover:text-green-600 font-medium bg-transparent">
          Sign In
        </button>
      </p>
    </>
  );
}
