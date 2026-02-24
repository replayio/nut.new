import { useEffect, useState } from 'react';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { GoogleIcon } from '~/components/icons/google-icon';
import { UserPlus } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/Checkbox';

interface SignUpFormProps {
  onToggleForm: () => void;
  addIntercomUser: (userEmail: string, name: string) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
};

export function SignUpForm({ addIntercomUser, onToggleForm, onSuccess, onError }: SignUpFormProps) {
  const [disabled, setDisabled] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [isEmailValid, setIsEmailValid] = useState(true);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsProcessing(true);

    try {
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}&emailConfirm=true`,
        },
      });

      if (data.user?.email && isChecked) {
        addIntercomUser(data.user.email, data.user.user_metadata.full_name);
      }

      if (error) {
        throw error;
      }

      // Note: Analytics tracking will happen when user clicks email confirmation link
      // and lands on /auth/callback, so we don't track here to avoid duplicate events

      onSuccess("Check your email for the confirmation link! You'll be redirected back here after confirming.");
    } catch (error) {
      const authError = error as AuthError;
      onError(authError.message || 'Failed to sign up');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}&intercom=${isChecked}&isSignup=true`,
      },
    });

    if (error) {
      onError(error.message || 'Failed to sign in with Google');
      return;
    }
    // OAuth redirect initiated - user will be redirected to Google and then back to our callback
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
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border/50">
          <UserPlus className="text-foreground" size={24} />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Create Account</h2>
        <p className="text-muted-foreground mt-2">
          Join us and start building. After signing up, you will be able to build one app on our free plan or unlimited
          apps if you upgrade to our builder plan.
        </p>
      </div>

      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isProcessing}
        variant="outline"
        className="w-full mb-6 h-12 flex items-center justify-center gap-3"
      >
        <GoogleIcon />
        <span className="text-foreground">{isProcessing ? 'Processing...' : 'Continue with Google'}</span>
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

      <form onSubmit={handleSignUp} className="space-y-6">
        <div>
          <label htmlFor="name" className="block mb-2 text-sm font-semibold text-foreground">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-4 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Enter your name"
            required
          />
        </div>

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
            placeholder="Create a password"
            required
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block mb-2 text-sm font-semibold text-foreground">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-4 border rounded-md bg-background text-foreground border-input focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 placeholder:text-muted-foreground"
            placeholder="Confirm your password"
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
            Passwords must be at least 6 characters long
          </div>
        )}

        <div className="p-4 bg-card rounded-md border border-border/30">
          <Checkbox
            id="terms"
            checked={isChecked}
            onCheckedChange={(checked) => setIsChecked(checked === true)}
            label="I agree to receive update emails from Replay and understand the terms of service."
          />
        </div>

        <Button type="submit" disabled={isProcessing || disabled} className="w-full h-12" size="lg">
          {isProcessing ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>

      <div className="mt-8 text-center p-4 bg-card rounded-md border border-border/30">
        <p className="text-muted-foreground text-sm">
          Already have an account?{' '}
          <Button onClick={onToggleForm} variant="link" className="p-0 h-auto font-semibold">
            Sign In
          </Button>
        </p>
      </div>
    </>
  );
}
