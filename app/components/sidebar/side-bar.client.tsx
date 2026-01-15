import { useStore } from '@nanostores/react';
import { MessageCircleMore, Palette, SlidersHorizontal, History } from 'lucide-react';
import { sidebarPanelStore, type SidebarPanel } from '~/lib/stores/sidebarPanel';
import { ClientAuth } from '~/components/auth/ClientAuth';
import { ClientOnly } from 'remix-utils/client-only';
import { Suspense } from 'react';
import { SideNavButton } from './SideNavButton';

export function SideBar() {
  const activePanel = useStore(sidebarPanelStore.activePanel);

  const handlePanelClick = (panel: SidebarPanel) => {
    sidebarPanelStore.setActivePanel(panel);
  };

  const navItems: { icon: React.ReactNode; label: string; panel: SidebarPanel }[] = [
    { icon: <MessageCircleMore size={20} strokeWidth={1.5} />, label: 'Chat', panel: 'chat' },
    { icon: <Palette size={20} strokeWidth={1.5} />, label: 'Design', panel: 'design' },
    { icon: <SlidersHorizontal size={20} strokeWidth={1.5} />, label: 'Settings', panel: 'settings' },
    { icon: <History size={20} strokeWidth={1.5} />, label: 'History', panel: 'history' },
  ];

  return (
    <aside className="flex flex-col items-center h-full w-[72px] bg-bolt-elements-background-depth-2">
      {/* Logo */}
      <div className="flex items-center justify-center w-14 h-14 m-2">
        <img src="/logo.svg" alt="Logo" className="w-9 h-9" />
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-2 py-1">
        {navItems.map((item) => (
          <SideNavButton
            key={item.panel}
            icon={item.icon}
            label={item.label}
            isSelected={activePanel === item.panel}
            onClick={() => handlePanelClick(item.panel)}
          />
        ))}
      </nav>

      {/* User Avatar at Bottom */}
      <div className="flex justify-center items-center py-3 w-full px-2">
        <ClientOnly>
          {() => (
            <Suspense
              fallback={
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
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
