import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSupabase } from '~/lib/supabase/client';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { AuthStateMessage } from './AuthStateMessage';
import { PasswordResetForm } from './PasswordResetForm';
import { getPeanutsRemaining } from '~/lib/replay/Account';
import { AccountModal } from './AccountModal';

export function ClientAuth() {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [peanutsRemaining, setPeanutsRemaining] = useState<number | undefined>(undefined);
  const [authState, setAuthState] = useState<'form' | 'success' | 'error' | 'reset'>('form');
  const [authMessage, setAuthMessage] = useState<string>('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const addIntercomUser = async (userEmail: string) => {
    try {
      const response = await fetch('/api/intercom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user to Intercom');
      }

      console.log('New contact created in Intercom');
    } catch (error) {
      console.error('Error adding user to Intercom:', error);
      toast.error('Failed to sync with Intercom (non-critical)');
    }
  };

  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await getSupabase().auth.getUser();
        setUser(data.user ?? undefined);
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
      setUser(session?.user ?? undefined);
      if (session?.user) {
        setShowAuthModal(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateUsageData = async () => {
    try {
      const peanutsRemaining = await getPeanutsRemaining();
      setPeanutsRemaining(peanutsRemaining);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  useEffect(() => {
    if (showDropdown) {
      updateUsageData();
    }
  }, [showDropdown]);

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
    setShowDropdown(false);
    toast.success('Signed out successfully');
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />;
  }

  const useAvatarURL = false;

  return (
    <>
      {user ? (
        <div className="relative">
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {useAvatarURL && user.user_metadata?.avatar_url ? (
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
            <div className="absolute right-0 mt-2 py-2 w-64 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg z-10">
              <div className="px-4 py-3 text-bolt-elements-textPrimary border-b border-bolt-elements-borderColor">
                <div className="text-sm text-bolt-elements-textSecondary">Signed in as</div>
                <div className="font-medium truncate">{user.email}</div>
              </div>
              <div className="px-4 py-3 text-bolt-elements-textPrimary border-b border-bolt-elements-borderColor">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Peanuts</span>
                    <span className="font-medium">{peanutsRemaining ?? '...'}</span>
                  </div>
                </div>
              </div>
              <div className="px-2 pt-2">
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="w-full px-4 py-2 text-left bg-green-500 text-white hover:bg-green-600 rounded-md transition-colors flex items-center justify-center"
                >
                  Account
                </button>
              </div>
              <div className="px-2 pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left bg-green-500 text-white hover:bg-green-600 rounded-md transition-colors flex items-center justify-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setShowAuthModal(true);
            setIsSignUp(false);
            setAuthState('form');
            setAuthMessage('');
            setShowPasswordReset(false);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 font-medium transition-colors shadow-lg"
        >
          Sign In
        </button>
      )}

      {showAuthModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50"
          onClick={() => {
            setShowAuthModal(false);
            setAuthState('form');
            setAuthMessage('');
            setShowPasswordReset(false);
          }}
        >
          <div
            className="bg-bolt-elements-background-depth-1 p-8 rounded-lg w-full max-w-md mx-auto border border-bolt-elements-borderColor"
            onClick={(e) => e.stopPropagation()}
          >
            {authState === 'success' ? (
              <AuthStateMessage
                type="success"
                title="Check Your Email"
                message={authMessage}
                onClose={() => {
                  setShowAuthModal(false);
                  setAuthState('form');
                  setAuthMessage('');
                }}
                closeButtonText="Got it"
              />
            ) : authState === 'error' ? (
              <AuthStateMessage
                type="error"
                title="Authentication Error"
                message={authMessage}
                onClose={() => {
                  setShowAuthModal(false);
                  setAuthState('form');
                  setAuthMessage('');
                  setShowPasswordReset(false);
                }}
                onRetry={() => {
                  setAuthState('form');
                  setAuthMessage('');
                  setShowPasswordReset(false);
                }}
                closeButtonText="Close"
                retryButtonText="Try Again"
              />
            ) : isSignUp ? (
              <SignUpForm
                addIntercomUser={addIntercomUser}
                onToggleForm={() => {
                  setIsSignUp(false);
                  setAuthState('form');
                  setAuthMessage('');
                  setShowPasswordReset(false);
                }}
                onSuccess={(message) => {
                  setAuthState('success');
                  setAuthMessage(message);
                }}
                onError={(message) => {
                  setAuthState('error');
                  setAuthMessage(message);
                }}
              />
            ) : showPasswordReset ? (
              <PasswordResetForm
                onBack={() => {
                  setShowPasswordReset(false);
                  setAuthState('form');
                  setAuthMessage('');
                }}
                onSuccess={(message) => {
                  setAuthState('success');
                  setAuthMessage(message);
                }}
                onError={(message) => {
                  setAuthState('error');
                  setAuthMessage(message);
                }}
              />
            ) : (
              <SignInForm
                onToggleForm={() => {
                  setIsSignUp(true);
                  setAuthState('form');
                  setAuthMessage('');
                  setShowPasswordReset(false);
                }}
                onError={(message) => {
                  setAuthState('error');
                  setAuthMessage(message);
                }}
                onForgotPassword={() => {
                  setShowPasswordReset(true);
                  setAuthState('form');
                  setAuthMessage('');
                }}
              />
            )}
          </div>
        </div>
      )}

      {showAccountModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50"
          onClick={() => {
            setShowAccountModal(false);
            setShowDropdown(false);
          }}
        >
          <AccountModal user={user} />
        </div>
      )}
    </>
  );
}
