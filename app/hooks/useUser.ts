import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';

/**
 * Hook to identify user in analytics and LogRocket whenever user object changes
 * This ensures user identification is always up to date across all services
 */
export function useUser() {
  const user = useStore(userStore);

  useEffect(() => {
    if (!user?.email || !user?.id) {
      return;
    }
    // Identify user in Segment Analytics
    if (window.analytics) {
      window.analytics.identify(user.id, {
        email: user.email,
        userId: user.id,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        updatedAt: user.updated_at,
      });
    }

    // Identify user in LogRocket
    if (window.LogRocket) {
      window.LogRocket.identify(user.id, {
        email: user.email,
        userId: user.id,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        updatedAt: user.updated_at,
      });
    }

    if (window.Intercom) {
      console.log('Intercom is available');
      fetch(`/api/intercom/jwt?user_id=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.jwt && window.Intercom) {
            console.log('Intercom JWT:', data.jwt);
            window.Intercom('boot', {
              api_base: 'https://api-iam.intercom.io',
              app_id: 'k7f741xx',
              intercom_user_jwt: data.jwt,
              user_id: user.id,
              email: user.email,
            });
          }
        });
    }
  }, [user?.id, user?.email]);

  return user;
}
