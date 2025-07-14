import React from 'react';
import { ChatMode } from '~/lib/replay/ChatManager';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import Features from './components/Features/Features';

interface PlanViewProps {
  appSummary: AppSummary | null;
  handleSendMessage?: (event: React.UIEvent, messageInput: string, startPlanning: boolean, chatMode?: ChatMode) => void;
  setActiveTab?: (tab: 'planning' | 'preview') => void;
}

const PlanView = ({ appSummary, handleSendMessage, setActiveTab }: PlanViewProps) => {
  return (
    <div className="relative h-full">
      <div className="h-full overflow-auto bg-transparent p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">Feature Plan</div>

          <div className="mb-8">
            <div className="text-lg font-semibold mb-3 text-bolt-elements-textPrimary">Project Description</div>
            <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary?.description}</div>
          </div>
          {appSummary?.features && (
            <Features appSummary={appSummary} handleSendMessage={handleSendMessage} setActiveTab={setActiveTab} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanView;
