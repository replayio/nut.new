import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { workbenchStore } from '~/lib/stores/workbench';
import { mobileNavStore } from '~/lib/stores/mobileNav';

export const MobileNav = () => {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const activeTab = useStore(mobileNavStore.activeTab);

  const handleTabClick = (tab: 'chat' | 'planning' | 'preview') => {
    if (tab === 'chat') {
      // Close workbench for chat
      workbenchStore.showWorkbench.set(false);
    } else {
      // Open workbench for plan/preview
      if (!showWorkbench) {
        workbenchStore.showWorkbench.set(true);
      }
    }
    mobileNavStore.setActiveTab(tab);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bolt-elements-background-depth-2 border-t border-bolt-elements-borderColor">
      <div className="flex w-full">
        <button
          onClick={() => handleTabClick('chat')}
          className={classNames('flex-1 flex flex-col items-center justify-center py-2 px-2 transition-colors', {
            'text-bolt-elements-textPrimary bg-bolt-elements-background-depth-3': activeTab === 'chat',
            'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1':
              activeTab !== 'chat',
          })}
        >
          <div className="i-ph:chat-circle text-lg mb-0.5" />
          <span className="text-xs font-medium">Chat</span>
        </button>

        <button
          onClick={() => handleTabClick('planning')}
          className={classNames(
            'flex-1 flex flex-col items-center justify-center py-2 px-2 transition-colors border-l border-r border-bolt-elements-borderColor',
            {
              'text-bolt-elements-textPrimary bg-bolt-elements-background-depth-3': activeTab === 'planning',
              'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1':
                activeTab !== 'planning',
            },
          )}
        >
          <div className="i-ph:list-bullets text-lg mb-0.5" />
          <span className="text-xs font-medium">Plan</span>
        </button>

        <button
          onClick={() => handleTabClick('preview')}
          className={classNames('flex-1 flex flex-col items-center justify-center py-2 px-2 transition-colors', {
            'text-bolt-elements-textPrimary bg-bolt-elements-background-depth-3': activeTab === 'preview',
            'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1':
              activeTab !== 'preview',
          })}
        >
          <div className="i-ph:monitor text-lg mb-0.5" />
          <span className="text-xs font-medium">Preview</span>
        </button>
      </div>
    </div>
  );
};
