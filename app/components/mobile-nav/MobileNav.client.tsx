import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { workbenchStore } from '~/lib/stores/workbench';
import { mobileNavStore, type MobileNavTab } from '~/lib/stores/mobileNav';
import { sidebarPanelStore } from '~/lib/stores/sidebarPanel';
import { MessageCircle, AppWindow, SlidersHorizontal, History, type LucideIcon } from 'lucide-react';

interface TabConfig {
  id: MobileNavTab;
  label: string;
  Icon: LucideIcon;
}

const tabs: TabConfig[] = [
  { id: 'chat', label: 'Chat', Icon: MessageCircle },
  { id: 'canvas', label: 'Canvas', Icon: AppWindow },
  // { id: 'theme', label: 'Theme', Icon: Palette },
  { id: 'settings', label: 'Settings', Icon: SlidersHorizontal },
  { id: 'history', label: 'History', Icon: History },
];

export const MobileNav = () => {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const activeTab = useStore(mobileNavStore.activeTab);

  const handleTabClick = (tab: MobileNavTab) => {
    mobileNavStore.setActiveTab(tab);

    // Handle workbench visibility
    if (tab === 'canvas') {
      if (!showWorkbench) {
        workbenchStore.showWorkbench.set(true);
      }
    } else {
      workbenchStore.showWorkbench.set(false);
    }

    // Map mobile tabs to sidebar panels
    switch (tab) {
      case 'chat':
        sidebarPanelStore.setActivePanel('chat');
        break;
      // case 'theme':
      //   sidebarPanelStore.setActivePanel('design');
      //   break;
      case 'settings':
        sidebarPanelStore.setActivePanel('settings');
        break;
      case 'history':
        sidebarPanelStore.setActivePanel('history');
        break;
      case 'canvas':
        // Keep current panel, just show workbench
        break;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-muted border-t border-border safe-area-bottom">
      <div className="flex w-full p-1 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={classNames(
                'flex-1 flex flex-col items-center justify-center h-14 px-4 py-2 gap-2 rounded-md transition-colors',
                isActive
                  ? 'bg-background text-rose-500 border border-border shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={20} className={isActive ? 'text-rose-500' : ''} />
              <span className={classNames('text-xs font-medium', isActive ? 'text-rose-500' : '')}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
