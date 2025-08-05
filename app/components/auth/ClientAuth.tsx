import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getSupabase } from '~/lib/supabase/client';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { AuthStateMessage } from './AuthStateMessage';
import { PasswordResetForm } from './PasswordResetForm';
import { AccountModal } from './AccountModal';
import { peanutsStore, refreshPeanutsStore } from '~/lib/stores/peanuts';
import { useStore } from '@nanostores/react';

export function ClientAuth() {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const peanutsRemaining = useStore(peanutsStore.peanutsRemaining);
  const [authState, setAuthState] = useState<'form' | 'success' | 'error' | 'reset'>('form');
  const [authMessage, setAuthMessage] = useState<string>('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (showDropdown) {
      refreshPeanutsStore();
    }
  }, [showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSignOut = async () => {
    await getSupabase().auth.signOut();
    setShowDropdown(false);
    toast.success('Signed out successfully');
  };

  const handleShowAccountModal = () => {
    setShowAccountModal(true);
    setShowDropdown(false);
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
            ref={buttonRef}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-white/20 hover:border-white/30 group"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {useAvatarURL && user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="User avatar"
                className="w-full h-full rounded-lg object-cover transition-transform duration-200 group-hover:scale-110"
              />
            ) : (
              <span className="text-sm font-semibold transition-transform duration-200 group-hover:scale-110">
                <div className="i-ph:user text-lg" />
              </span>
            )}
          </button>

          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-[-10px] mt-2 py-3 w-72 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-xl shadow-2xl z-10"
            >
              <div className="px-6 py-4 border-b border-bolt-elements-borderColor">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bolt-elements-background-depth-2 rounded-full flex items-center justify-center border border-bolt-elements-borderColor">
                    <div className="i-ph:user text-lg text-bolt-elements-textPrimary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-bolt-elements-textSecondary mb-1">Signed in as</div>
                    <div className="font-medium text-bolt-elements-textPrimary truncate text-sm">{user.email}</div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-bolt-elements-borderColor">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥜</span>
                    <span className="text-bolt-elements-textPrimary font-medium">Peanuts</span>
                  </div>
                  <div className="text-bolt-elements-textPrimary font-bold text-lg">{peanutsRemaining ?? '...'}</div>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <button
                  onClick={handleShowAccountModal}
                  className="w-full px-4 py-3 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-all duration-200 flex items-center gap-3 font-medium shadow-sm hover:shadow-md"
                >
                  <div className="i-ph:gear text-lg" />
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-3 bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-lg transition-all duration-200 flex items-center gap-3 font-medium"
                >
                  <div className="i-ph:sign-out text-lg" />
                  <span>Sign Out</span>
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
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl hover:from-blue-600 hover:to-green-600 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
        >
          <span className="transition-transform duration-200 group-hover:scale-105">
            Sign In
          </span>
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
          <AccountModal user={user} onClose={() => setShowAccountModal(false)} />
        </div>
      )}
    </>
  );
}
