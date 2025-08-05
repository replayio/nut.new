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

  const getTabClasses = (tabName: 'chat' | 'planning' | 'preview', isMiddle = false) => {
    const baseClasses =
      'flex-1 flex flex-col items-center justify-center py-2 px-2 transition-all duration-200 group relative';
    const middleClasses = isMiddle ? 'border-x border-bolt-elements-borderColor/30' : '';

    if (activeTab === tabName) {
      return classNames(
        baseClasses,
        middleClasses,
        'bg-gradient-to-t from-blue-500 to-indigo-500 text-white shadow-lg border-t-2 border-t-white/20',
      );
    }

    return classNames(
      baseClasses,
      middleClasses,
      'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1/50 hover:shadow-sm',
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bolt-elements-background-depth-2/95 backdrop-blur-md border-t border-bolt-elements-borderColor/50 shadow-2xl">
      <div className="flex w-full">
        <button onClick={() => handleTabClick('chat')} className={getTabClasses('chat')}>
          <div
            className={classNames(
              'text-lg mb-0.5 transition-transform duration-200 group-hover:scale-110',
              'i-ph:chat-circle',
              activeTab === 'chat' ? 'drop-shadow-sm' : '',
            )}
          />
          <span
            className={classNames(
              'text-xs font-semibold transition-transform duration-200 group-hover:scale-105',
              activeTab === 'chat' ? 'drop-shadow-sm' : 'font-medium',
            )}
          >
            Chat
          </span>
        </button>

        <button onClick={() => handleTabClick('planning')} className={getTabClasses('planning', true)}>
          <div
            className={classNames(
              'text-lg mb-0.5 transition-transform duration-200 group-hover:scale-110',
              'i-ph:list-bullets',
              activeTab === 'planning' ? 'drop-shadow-sm' : '',
            )}
          />
          <span
            className={classNames(
              'text-xs font-semibold transition-transform duration-200 group-hover:scale-105',
              activeTab === 'planning' ? 'drop-shadow-sm' : 'font-medium',
            )}
          >
            Plan
          </span>
        </button>

        <button onClick={() => handleTabClick('preview')} className={getTabClasses('preview')}>
          <div
            className={classNames(
              'text-lg mb-0.5 transition-transform duration-200 group-hover:scale-110',
              'i-ph:monitor',
              activeTab === 'preview' ? 'drop-shadow-sm' : '',
            )}
          />
          <span
            className={classNames(
              'text-xs font-semibold transition-transform duration-200 group-hover:scale-105',
              activeTab === 'preview' ? 'drop-shadow-sm' : 'font-medium',
            )}
          >
            Preview
          </span>
        </button>
      </div>
    </div>
  );
};
