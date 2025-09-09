import { useState } from 'react';
import { classNames } from '~/utils/classNames';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabbedInterfaceProps {
  tabs: Tab[];
  children: React.ReactNode[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const TabbedInterface = ({ tabs, children, defaultTab, onTabChange }: TabbedInterfaceProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <div className="flex flex-col h-full bg-bolt-elements-background-depth-1">
      {/* Tab Headers */}
      <div className="flex items-center border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={classNames(
                'px-4 py-2.5 text-sm font-medium transition-all duration-200',
                'border-b-2 -mb-[2px] flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-bolt-elements-borderColorActive text-bolt-elements-textPrimary bg-bolt-elements-background-depth-2'
                  : 'border-transparent text-bolt-elements-textSecondary bg-bolt-elements-background-depth-1 hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
        {children[activeIndex]}
      </div>
    </div>
  );
};
