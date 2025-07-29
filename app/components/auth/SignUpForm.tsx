import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { GoogleIcon } from '~/components/icons/google-icon';

interface SignUpFormProps {
  onToggleForm: () => void;
  addIntercomUser: (userEmail: string) => void;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
};

export function SignUpForm({ addIntercomUser, onToggleForm }: SignUpFormProps) {
  const [disabled, setDisabled] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await getSupabase().auth.signUp({ email, password });

      if (data.user?.email && isChecked) {
        addIntercomUser(data.user.email);
      }

      if (error) {
        throw error;
      }

      toast.success('Check your email for the confirmation link!');
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Failed to sign up');
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
      return;
    }

    const {
      data: { user },
    } = await getSupabase().auth.getUser();
    if (user?.email && isChecked) {
      addIntercomUser(user.email);
    }
  };

  useEffect(() => {
    const emailValid = email === '' || validateEmail(email);
    setIsEmailValid(emailValid);
    setDisabled(
      password !== confirmPassword || email === '' || password === '' || confirmPassword === '' || !emailValid,
    );
  }, [password, confirmPassword, email]);

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">Create Account</h2>

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

      <form onSubmit={handleSignUp}>
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

        <div className="mb-4">
          <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
        </div>

        {password !== '' && confirmPassword !== '' && password !== confirmPassword && (
          <div className="mb-4 text-sm text-red-500">Passwords do not match</div>
        )}

        {password !== '' && password.length < 6 && (
          <div className="mb-4 text-sm text-red-500">Passwords must be at least 6 characters long</div>
        )}

        <button
          type="submit"
          disabled={isProcessing || disabled}
          className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
        >
          {isProcessing ? 'Processing...' : 'Create Account'}
        </button>
      </form>

      <div className="flex justify-center items-center gap-2 my-6">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            id="terms"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
            className="peer appearance-none h-4 w-4 rounded border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 cursor-pointer checked:bg-green-500 checked:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <svg
            className="absolute left-0 w-4 h-4 pointer-events-none opacity-0 peer-checked:opacity-100 text-white"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <label className="text-bolt-elements-textSecondary cursor-pointer" htmlFor="terms">
          I agree to receive update emails from Nut.
        </label>
      </div>

      <p className="mt-6 text-center text-bolt-elements-textSecondary">
        Already have an account?{' '}
        <button onClick={onToggleForm} className="text-green-500 hover:text-green-600 font-medium bg-transparent">
          Sign In
        </button>
      </p>
    </>
  );
}
