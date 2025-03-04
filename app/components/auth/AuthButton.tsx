import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { userStore, signOut } from '~/lib/stores/auth';
import { isSupabaseInitialized } from '~/lib/supabase/client';
import { AuthModal } from './AuthModal';

interface AuthButtonProps {
  className?: string;
}

export function AuthButton({ className = '' }: AuthButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = useStore(userStore);
  const supabaseAvailable = isSupabaseInitialized();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Don't render the button if Supabase isn't available
  if (!supabaseAvailable) {
    return null;
  }

  return (
    <>
      <div className="flex items-center">
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm truncate max-w-[150px]">{user.email}</span>
            <button
              onClick={handleSignOut}
              className={`px-4 py-1 text-sm font-medium bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 rounded-md ${className}`}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-4 py-1 text-sm font-medium bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 rounded-md ${className}`}
          >
            Sign In
          </button>
        )}
      </div>

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
} 