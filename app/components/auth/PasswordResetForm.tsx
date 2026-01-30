import { useState, useEffect } from 'react';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { Key } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';

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
      const redirectUrl = 'https://nut.new/reset-password';

      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
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
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-bolt-elements-background-depth-2 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-bolt-elements-borderColor border-opacity-50">
          <Key className="text-bolt-elements-textPrimary" size={24} />
        </div>
        <h2 className="text-3xl font-bold text-bolt-elements-textHeading">Reset Your Password</h2>
        <p className="text-bolt-elements-textSecondary mt-2 leading-relaxed">
          Enter your email address and we'll send you a secure link to reset your password.
        </p>
      </div>

      <form onSubmit={handlePasswordReset} className="space-y-6">
        <div>
          <label htmlFor="reset-email" className="block mb-2 text-sm font-semibold text-bolt-elements-textPrimary">
            Email Address
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Enter your email address"
            required
          />
          {email !== '' && !isEmailValid && (
            <div className="mt-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
              Please enter a valid email address
            </div>
          )}
        </div>

        <Button type="submit" disabled={isProcessing || disabled} className="w-full h-12" size="lg">
          {isProcessing ? 'Sending Reset Link...' : 'Send Reset Link'}
        </Button>
      </form>

      <div className="mt-8 text-center p-4 bg-bolt-elements-background-depth-1 rounded-md border border-bolt-elements-borderColor border-opacity-30">
        <p className="text-bolt-elements-textSecondary text-sm">
          Remember your password?{' '}
          <Button onClick={onBack} variant="link" className="p-0 h-auto font-semibold">
            Sign In
          </Button>
        </p>
      </div>
    </>
  );
}
