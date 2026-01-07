import { useStore } from '@nanostores/react';
import { MessageSquare, Palette, SlidersHorizontal, History } from 'lucide-react';
import { cn } from '~/lib/utils';
import { sidebarPanelStore, type SidebarPanel } from '~/lib/stores/sidebarPanel';
import { userStore } from '~/lib/stores/auth';
import { ClientAuth } from '~/components/auth/ClientAuth';
import { ClientOnly } from 'remix-utils/client-only';
import { Suspense } from 'react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  panel: SidebarPanel;
  isActive: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 p-1 rounded-md transition-all duration-200 w-[56px]',
        'text-muted-foreground hover:text-foreground',
        isActive && 'bg-card text-foreground shadow-sm'
      )}
    >
      <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export function SideBar() {
  const activePanel = useStore(sidebarPanelStore.activePanel);
  const user = useStore(userStore);

  const handlePanelClick = (panel: SidebarPanel) => {
    sidebarPanelStore.setActivePanel(panel);
  };

  const navItems: { icon: React.ReactNode; label: string; panel: SidebarPanel }[] = [
    { icon: <MessageSquare size={16} />, label: 'Chat', panel: 'chat' },
    { icon: <Palette size={16} />, label: 'Theme', panel: 'theme' },
    { icon: <SlidersHorizontal size={16} />, label: 'Settings', panel: 'settings' },
    { icon: <History size={16} />, label: 'History', panel: 'history' },
  ];

  // Get user avatar URL or use default
  const userAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  console.log( 'userAvatarUrl', userAvatarUrl);

  return (
    <aside className="flex flex-col items-center h-full w-[65px] bg-background border-r border-border p-1">
      {/* Logo */}
      <div className="flex items-center justify-center my-4">
        <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col items-center gap-2 flex-1 w-full px-2">
        {navItems.map((item) => (
          <NavItem
            key={item.panel}
            icon={item.icon}
            label={item.label}
            panel={item.panel}
            isActive={activePanel === item.panel}
            onClick={() => handlePanelClick(item.panel)}
          />
        ))}
      </nav>

      {/* User Avatar at Bottom */}
      <div className="flex justify-center items-center mt-auto pt-4 border-t border-border w-full px-2">
        <ClientOnly>
          {() => (
            <Suspense
              fallback={
                <div className="w-10 h-10 rounded-xl bg-bolt-elements-background-depth-2 animate-pulse border border-bolt-elements-borderColor gap-2" />
              }
            >
              <ClientAuth />
            </Suspense>
          )}
        </ClientOnly>
      </div>
    </aside>
  );
}

export default SideBar;

