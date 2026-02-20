import { useState, useEffect } from 'react';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { GoogleIcon } from '~/components/icons/google-icon';
import { LogIn } from '~/components/ui/Icon';
import { authModalStore } from '~/lib/stores/authModal';
import { Button } from '~/components/ui/button';

interface SignInFormProps {
  onToggleForm: () => void;
  onError: (message: string) => void;
  onForgotPassword?: () => void;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
};

export function SignInForm({ onToggleForm, onError, onForgotPassword }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      if (window.analytics && data.user) {
        window.analytics.identify(data.user.id, {
          name: data.user.user_metadata.full_name,
          email: data.user.email,
          userId: data.user.id,
          lastSignIn: new Date().toISOString(),
          signInMethod: 'email',
        });
      }
      if (window.LogRocket && data.user) {
        window.LogRocket.identify(data.user.id, {
          name: data.user.user_metadata.full_name,
          email: data.user.email,
          userId: data.user.id,
          lastSignIn: new Date().toISOString(),
          signInMethod: 'email',
        });
      }
      authModalStore.close();
    } catch (error) {
      const authError = error as AuthError;
      if (
        authError.message?.toLowerCase().includes('invalid') ||
        authError.message?.toLowerCase().includes('credentials') ||
        authError.message?.toLowerCase().includes('password')
      ) {
        onError('Your email or password is invalid. Please try again.');
      } else {
        onError(authError.message || 'Failed to sign in');
      }
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);

    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}&isSignup=false`,
        },
      });

      if (error) {
        throw error;
      }
      // OAuth redirect initiated - user will be redirected to Google and then back to our callback
    } catch (error) {
      const authError = error as AuthError;
      onError(authError.message || 'Failed to sign in with Google');
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    const emailValid = email === '' || validateEmail(email);
    setIsEmailValid(emailValid);
    setDisabled(email === '' || password === '' || !emailValid);
  }, [email, password]);

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border/50">
          <LogIn className="text-foreground" size={24} />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Welcome Back</h2>
        <p className="text-muted-foreground mt-2">Sign in to continue building amazing apps</p>
      </div>

      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isProcessing}
        variant="outline"
        className="w-full mb-6 h-12 flex items-center justify-center gap-3"
      >
        <GoogleIcon />
        <span>{isProcessing ? 'Processing...' : 'Continue with Google'}</span>
      </Button>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 py-2 bg-card text-muted-foreground rounded-lg border border-border/30">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSignIn} className="space-y-6">
        <div>
          <label htmlFor="email" className="block mb-2 text-sm font-semibold text-foreground">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Enter your email"
            required
          />
          {email !== '' && !isEmailValid && (
            <div className="mt-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
              Please enter a valid email address
            </div>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block mb-2 text-sm font-semibold text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Enter your password"
            required
          />
        </div>

        <Button type="submit" disabled={isProcessing || disabled} className="w-full h-12" size="lg">
          {isProcessing ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      {onForgotPassword && (
        <div className="mt-6 text-center">
          <Button onClick={onForgotPassword} variant="link" className="text-sm">
            Forgot password?
          </Button>
        </div>
      )}

      <div className="mt-8 text-center p-4 bg-card rounded-md border border-border/30">
        <p className="text-muted-foreground text-sm">
          Don't have an account?{' '}
          <Button onClick={onToggleForm} variant="link" className="p-0 h-auto font-semibold">
            Sign Up
          </Button>
        </p>
      </div>
    </>
  );
}
