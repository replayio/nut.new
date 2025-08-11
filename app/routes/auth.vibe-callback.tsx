import { useEffect } from 'react';
import { useSearchParams } from '@remix-run/react';

export default function VibeAuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get the full URL with hash fragment (contains tokens)

    // Extract the hash fragment which contains the tokens
    const hashFragment = window.location.hash;

    // Parse the hash fragment to extract tokens
    const hashParams = new URLSearchParams(hashFragment.slice(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const expiresIn = hashParams.get('expires_in');
    const expiresAt = hashParams.get('expires_at');
    const providerToken = hashParams.get('provider_token');

    // Also get any error parameters
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (accessToken && refreshToken) {
      // Create the auth session object in Supabase format
      const session = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn ? parseInt(expiresIn) : 3600,
        expires_at: expiresAt ? parseInt(expiresAt) : Math.floor(Date.now() / 1000) + 3600,
        provider_token: providerToken,
        token_type: 'bearer',
        force_refresh: Date.now().toString(),
      };

      // Store in localStorage with a unique key for the vibe auth
      const vibeAuthData = {
        session,
        timestamp: Date.now(),
        originalCallbackUrl: searchParams.get('callback_url'),
      };

      localStorage.setItem('vibe-auth-callback', JSON.stringify(vibeAuthData));
      console.log('auth.vibe-callback: Stored auth data in localStorage', vibeAuthData);

      // Also store in Supabase's expected format for the iframe
      const supabaseKey = 'sb-auth-auth-token';
      const supabaseAuthData = {
        currentSession: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn ? parseInt(expiresIn) : 3600,
          expires_at: expiresAt ? parseInt(expiresAt) : Math.floor(Date.now() / 1000) + 3600,
          provider_token: providerToken,
          token_type: 'bearer',
          user: null, // We don't have user data from just the hash
        },
        expiresAt: expiresAt ? parseInt(expiresAt) : Math.floor(Date.now() / 1000) + 3600,
      };

      localStorage.setItem(supabaseKey, JSON.stringify(supabaseAuthData));

      // Restore the temporary auth token
      const tmpAuthToken = localStorage.getItem('sb-tmp-auth-token');
      if (tmpAuthToken) {
        localStorage.setItem('sb-zbkcavxidjyslqmnbfux-auth-token', tmpAuthToken);
      }
    } else if (error) {
      // Store error in localStorage
      const errorData = {
        error,
        errorDescription,
        timestamp: Date.now(),
      };
      localStorage.setItem('vibe-auth-callback-error', JSON.stringify(errorData));
      console.error('auth.vibe-callback: OAuth error:', error, errorDescription);
    }

    // Try to close the window
    setTimeout(() => {
      window.close();
    }, 100);
  }, [searchParams]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div>
        <h2>Completing authentication...</h2>
        <p>This window will close automatically.</p>
      </div>
    </div>
  );
}
