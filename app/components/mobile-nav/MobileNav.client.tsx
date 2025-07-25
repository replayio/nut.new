import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { workbenchStore } from '~/lib/stores/workbench';
import { mobileNavStore } from '~/lib/stores/mobileNav';

export const MobileNav = () => {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const activeTab = useStore(mobileNavStore.activeTab);

  const handleTabClick = (tab: 'chat' | 'planning' | 'preview') => {
    if (tab === 'chat') {
      workbenchStore.showWorkbench.set(false);
    } else {
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
          className={classNames(
            'flex-1 flex flex-col items-center justify-center py-2 px-2 transition-all duration-200',
            {
              'text-white bg-gray-700 border border-gray-600 shadow-inner dark:text-gray-800 dark:bg-gray-200 dark:border-gray-300':
                activeTab === 'chat',
              'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 dark:text-bolt-elements-textTertiary dark:bg-bolt-elements-background-depth-4 dark:hover:text-bolt-elements-textSecondary':
                activeTab !== 'chat',
            },
          )}
          style={activeTab === 'chat' ? { transform: 'translateY(1px)' } : {}}
        >
          <div className="i-ph:chat-circle text-lg mb-0.5" />
          <span className="text-xs font-medium">Chat</span>
        </button>

        <button
          onClick={() => handleTabClick('planning')}
          className={classNames(
            'flex-1 flex flex-col items-center justify-center py-2 px-2 transition-all duration-200 border-l border-r border-bolt-elements-borderColor',
            {
              'text-white bg-gray-700 border-t border-b border-gray-600 shadow-inner dark:text-gray-800 dark:bg-gray-200 dark:border-t-gray-300 dark:border-b-gray-300':
                activeTab === 'planning',
              'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 dark:text-bolt-elements-textTertiary dark:bg-bolt-elements-background-depth-4 dark:hover:text-bolt-elements-textSecondary':
                activeTab !== 'planning',
            },
          )}
          style={activeTab === 'planning' ? { transform: 'translateY(1px)' } : {}}
        >
          <div className="i-ph:list-bullets text-lg mb-0.5" />
          <span className="text-xs font-medium">Plan</span>
        </button>

        <button
          onClick={() => handleTabClick('preview')}
          className={classNames(
            'flex-1 flex flex-col items-center justify-center py-2 px-2 transition-all duration-200',
            {
              'text-white bg-gray-700 border border-gray-600 shadow-inner dark:text-gray-800 dark:bg-gray-200 dark:border-gray-300':
                activeTab === 'preview',
              'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 dark:text-bolt-elements-textTertiary dark:bg-bolt-elements-background-depth-4 dark:hover:text-bolt-elements-textSecondary':
                activeTab !== 'preview',
            },
          )}
          style={activeTab === 'preview' ? { transform: 'translateY(1px)' } : {}}
        >
          <div className="i-ph:monitor text-lg mb-0.5" />
          <span className="text-xs font-medium">Preview</span>
        </button>
      </div>
    </div>
  );
};
