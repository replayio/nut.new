import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSupabase } from '~/lib/supabase/client';
import type { AuthError, Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export function ClientAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await getSupabase().auth.getUser();
        setUser(data.user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    getUser();

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      setShowSignIn(false);
      toast.success('Successfully signed in!');
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Failed to sign in');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);

    try {
      const { error } = await getSupabase().auth.signUp({ email, password });

      if (error) {
        throw error;
      }

      toast.success('Check your email for the confirmation link!');
      setShowSignIn(false);
    } catch (error) {
      const authError = error as AuthError;
      toast.error(authError.message || 'Failed to sign up');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
    setShowDropdown(false);
    toast.success('Signed out successfully');
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />;
  }

  return (
    <>
      {user ? (
        <div className="relative">
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="User avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{user.email?.substring(0, 2).toUpperCase()}</span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 py-2 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded shadow-lg z-10">
              <div className="px-4 py-2 text-bolt-elements-textPrimary border-b border-bolt-elements-borderColor">
                {user.email}
              </div>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowSignIn(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold"
        >
          Sign In
        </button>
      )}

      {showSignIn && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setShowSignIn(false)}
        >
          <div
            className="bg-bolt-elements-background-depth-1 p-6 rounded-lg max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-bolt-elements-textPrimary">Sign In</h2>
            <form onSubmit={handleSignIn}>
              <div className="mb-4">
                <label htmlFor="email" className="block mb-1 text-bolt-elements-textPrimary">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="block mb-1 text-bolt-elements-textPrimary">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSigningIn}
                  className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSigningIn ? 'Processing...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={isSigningIn}
                  className="flex-1 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {isSigningIn ? 'Processing...' : 'Sign Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
