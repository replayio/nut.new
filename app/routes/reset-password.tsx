import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { getSupabase } from '~/lib/supabase/client';
import { PasswordUpdateForm } from '~/components/auth/PasswordUpdateForm';
import { AuthStateMessage } from '~/components/auth/AuthStateMessage';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [authMessage, setAuthMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const {
          data: { session },
          error,
        } = await getSupabase().auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          setAuthState('form');
        } else {
          setAuthState('error');
          setAuthMessage('Invalid or expired reset link. Please request a new password reset.');
        }
      } catch (error) {
        setAuthState('error');
        setAuthMessage(error instanceof Error ? error.message : 'Failed to verify reset link. Please try again.');
      }
    };

    handleAuthCallback();

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setAuthState('form');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSuccess = (message: string) => {
    setAuthState('success');
    setAuthMessage(message);

    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  const handleError = (message: string) => {
    setAuthState('error');
    setAuthMessage(message);
  };

  return (
    <div className="min-h-screen bg-bolt-elements-background-depth-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-bolt-elements-background-depth-1 p-8 rounded-lg border border-bolt-elements-borderColor">
          {authState === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-bolt-elements-textSecondary">Verifying reset link...</p>
            </div>
          )}

          {authState === 'form' && <PasswordUpdateForm onSuccess={handleSuccess} onError={handleError} />}

          {authState === 'success' && (
            <AuthStateMessage
              type="success"
              title="Password Updated!"
              message={
                <div>
                  <p>{authMessage}</p>
                  <p className="mt-2 text-sm">Redirecting you to the app...</p>
                </div>
              }
              closeButtonText="Continue to App"
              onClose={() => navigate('/')}
            />
          )}

          {authState === 'error' && (
            <AuthStateMessage
              type="error"
              title="Reset Link Error"
              message={authMessage}
              onRetry={() => navigate('/')}
              onClose={() => navigate('/')}
              retryButtonText="Go to Sign In"
              closeButtonText="Close"
            />
          )}
        </div>
      </div>
    </div>
  );
}
