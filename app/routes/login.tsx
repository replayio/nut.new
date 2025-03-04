import { useEffect } from 'react';
import { useNavigate, json } from '@remix-run/react';
import { type LoaderFunction } from '@remix-run/cloudflare';
import { Auth } from '~/components/auth/Auth';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';

export const loader: LoaderFunction = () => {
  return json({});
};

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useStore(userStore);
  
  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-bolt-elements-background-depth-0">
      <Auth onClose={() => navigate('/')} />
    </div>
  );
} 