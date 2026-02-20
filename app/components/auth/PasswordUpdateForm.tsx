import { useState, useEffect } from 'react';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { Lock } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';

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
        <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border/50">
          <Lock className="text-foreground" size={24} />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Set New Password</h2>
        <p className="text-muted-foreground mt-2">Please enter your new password below.</p>
      </div>

      <form onSubmit={handlePasswordUpdate} className="space-y-6">
        <div>
          <label htmlFor="new-password" className="block mb-2 text-sm font-semibold text-foreground">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Enter your new password"
            required
          />
        </div>

        <div>
          <label
            htmlFor="confirm-new-password"
            className="block mb-2 text-sm font-semibold text-foreground"
          >
            Confirm New Password
          </label>
          <input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-4 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Confirm your new password"
            required
          />
        </div>

        {password !== '' && confirmPassword !== '' && password !== confirmPassword && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
            Passwords do not match
          </div>
        )}

        {password !== '' && password.length < 6 && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
            Password must be at least 6 characters long
          </div>
        )}

        <Button type="submit" disabled={isProcessing || disabled} className="w-full h-12" size="lg">
          {isProcessing ? 'Updating Password...' : 'Update Password'}
        </Button>
      </form>
    </>
  );
}
