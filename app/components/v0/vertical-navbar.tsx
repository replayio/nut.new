'use client';

import { MessageCircle, Palette, History, Settings, Rocket, LogIn } from '~/components/ui/Icon';
import { UserProfileMenu } from '~/components/header/UserProfileMenu';
import { cn } from '~/lib/utils';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';
import { authModalStore } from '~/lib/stores/authModal';

interface VerticalNavbarProps {
  isSidebarOpen: boolean;
  onHomeClick?: () => void;
}

export const NutLogo = () => (
  <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14.3333 3.66667V1M14.3333 3.66667C9 3.66667 4.33333 6.33333 3.66667 9C3.34267 10.2933 2.44133 11.6027 1 13C2.74667 12.8907 3.62933 12.6133 5 11.6667M14.3333 3.66667C19.6667 3.66667 24.3333 6.33333 25 9C25.3227 10.2933 25.9373 11.6187 27.6667 13C25.9107 13.2093 25.0427 12.888 23.6667 11.6667M5 11.6667V17C5.00022 19.0758 5.69206 21.0924 6.96623 22.7312C8.2404 24.37 10.0243 25.5375 12.036 26.0493C12.5853 26.188 13.1053 26.4387 13.5053 26.8387L14.3333 27.6667L15.1613 26.8387C15.5613 26.4387 16.0813 26.188 16.6307 26.0493C18.6425 25.5377 20.4265 24.3702 21.7007 22.7314C22.9749 21.0926 23.6667 19.0759 23.6667 17V11.6667M5 11.6667C5.72 12.8933 6.30933 13.4747 7.66667 14.3333C9.60267 13.4707 10.272 12.8693 11 11.6667C11.7933 12.9933 12.5347 13.5693 14.3333 14.3333C16.08 13.5053 16.816 12.9227 17.6667 11.6667C18.5053 12.9693 19.216 13.564 21 14.3333C22.612 13.6027 23.24 13.044 23.6667 11.6667"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground"
    />
  </svg>
);

export function VerticalNavbar({ isSidebarOpen, onHomeClick }: VerticalNavbarProps) {
  const user = useStore(userStore);

  const handleLoginClick = () => {
    authModalStore.open(false);
  };

  return (
    <div
      className={cn(
        'relative flex flex-col w-16 bg-background py-4 h-full',
        isSidebarOpen ? '-z-10' : 'z-0'
      )}
      style={{
        transition: 'opacity 1s',
        opacity: isSidebarOpen ? 0 : 1,
      }}
    >
      {/* Nut Logo - Link to Homepage */}
      <a
        href="/"
        className="flex items-center justify-center mb-4 pt-1.5 hover:opacity-80 transition-opacity"
        title="Nut - Home"
        onClick={onHomeClick}
      >
        <NutLogo />
      </a>

      <div className="flex flex-col gap-2 px-2 flex-1">
        {/* Chat Icon */}
        <button
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent hover:bg-opacity-50"
          title="Chat"
        >
          <MessageCircle size={20} />
          <span className="text-[10px] font-medium leading-tight text-center">Chat</span>
        </button>

        {/* Design Icon */}
        <button
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent hover:bg-opacity-50"
          title="Design"
        >
          <Palette size={20} />
          <span className="text-[10px] font-medium leading-tight text-center">Design</span>
        </button>

        {/* History Icon */}
        <button
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent hover:bg-opacity-50"
          title="History"
        >
          <History size={20} />
          <span className="text-[10px] font-medium leading-tight text-center">History</span>
        </button>

        {/* Settings Icon */}
        <button
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent hover:bg-opacity-50"
          title="Settings"
        >
          <Settings size={20} />
          <span className="text-[10px] font-medium leading-tight text-center">Settings</span>
        </button>

        {/* Deploy Icon */}
        <button
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent hover:bg-opacity-50"
          title="Deploy"
        >
          <Rocket size={20} />
          <span className="text-[10px] font-medium leading-tight text-center">Deploy</span>
        </button>
      </div>

      {/* User Profile Menu or Login Button at bottom */}
      <div className="px-2 pt-2 flex justify-center">
        {user ? (
          <UserProfileMenu />
        ) : (
          <button
            onClick={handleLoginClick}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent hover:bg-opacity-50"
            title="Login"
          >
            <LogIn size={20} />
            <span className="text-[10px] font-medium leading-tight text-center">Login</span>
          </button>
        )}
      </div>
    </div>
  );
}
