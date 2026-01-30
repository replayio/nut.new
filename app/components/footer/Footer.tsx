import React from 'react';
import { MessageSquare } from '~/components/ui/Icon';
import { useStore } from '@nanostores/react';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import useViewport from '~/lib/hooks';
import { classNames } from '~/utils/classNames';

export const Footer: React.FC = () => {
  const isSmallViewport = useViewport(1024);
  const isSidebarOpen = !useStore(sidebarMenuStore.isCollapsed);

  return (
    <footer
      className={classNames(
        'w-full bg-background border-t border-border px-6 h-[40px] flex items-center justify-center transition-all duration-300',
        {
          'md:pl-[260px]': !isSmallViewport && isSidebarOpen,
          'md:pl-[60px]': !isSmallViewport && !isSidebarOpen,
        },
      )}
    >
      <div className="flex items-center justify-center text-xs gap-6">
        <div className="flex items-center">
          <a
            href="https://www.replay.io/discord"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-foreground hover:bg-foreground/90 text-background rounded-full text-xs font-medium transition-colors duration-200 whitespace-nowrap"
          >
            <MessageSquare size={14} />
            Join our Discord
          </a>
        </div>

        <div className="flex items-center justify-center">
          <span className="text-muted-foreground">
            Built with ❤️ by a team who got tired of going down token-eating debugging rabbit holes.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.replay.io/terms-of-service"
            className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:underline"
          >
            Terms
          </a>
          <span className="text-muted-foreground/50">|</span>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.replay.io/privacy-policy"
            className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:underline"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
};
