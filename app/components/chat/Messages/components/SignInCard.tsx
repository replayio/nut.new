import React, { useEffect } from 'react';
import { authModalStore } from '~/lib/stores/authModal';
import { UserPlus, LogIn } from '~/components/ui/Icon';

interface SignInCardProps {
  onMount?: () => void;
}

export const SignInCard: React.FC<SignInCardProps> = ({ onMount }) => {
  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, []);

  const handleSignInClick = () => {
    authModalStore.open(false);
  };

  return (
    <div className="w-full mt-5">
      <div className="bg-card border border-border rounded-md p-6 transition-colors duration-200 hover:bg-accent/50">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 bg-foreground text-background rounded-md">
            <UserPlus size={24} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Sign In to Continue Building</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              To start building and deploying your application, you'll need to sign in or create an account. After sign
              up, you will be able to build one app on our free plan or unlimited apps if you upgrade to our builder
              plan.
            </p>
          </div>

          <button
            onClick={handleSignInClick}
            className="flex items-center gap-3 px-6 py-3 bg-foreground hover:bg-foreground/90 text-background text-base font-semibold rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <LogIn size={18} />
            <span>Sign In to Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
