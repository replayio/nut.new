import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { GoogleIcon } from '~/components/icons/google-icon';

interface SignInFormProps {
  onToggleForm: () => void;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
};

export function SignInForm({ onToggleForm }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      toast.success('Successfully signed in!');
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Failed to sign in');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  useEffect(() => {
    const emailValid = email === '' || validateEmail(email);
    setIsEmailValid(emailValid);
    setDisabled(email === '' || password === '' || !emailValid);
  }, [email, password]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Welcome Back</h2>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isProcessing}
        className="w-full mb-6 p-3 flex items-center justify-center gap-2 bg-white text-gray-800 rounded-lg hover:bg-gray-100 disabled:opacity-50 border border-gray-300"
      >
        <GoogleIcon />
        <span>{isProcessing ? 'Processing...' : 'Continue with Google'}</span>
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-bolt-elements-borderColor"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSignIn}>
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
          {email !== '' && !isEmailValid && (
            <div className="mt-2 text-sm text-red-500">Please enter a valid email address</div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing || disabled}
          className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          {isProcessing ? 'Processing...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-bolt-elements-textSecondary">
        Don't have an account?{' '}
        <button onClick={onToggleForm} className="text-green-500 hover:text-green-600 font-medium bg-transparent">
          Sign Up
        </button>
      </p>
    </>
  );
}
