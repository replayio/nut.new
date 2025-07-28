import { AppFeatureStatus, type AppSummary } from '~/lib/persistence/messageAppSummary';
import Pages from './components/Pages';
import Features from './components/Features/Features';
import { useStore } from '@nanostores/react';
import { chatStore, doAbortChat, doSendMessage } from '~/lib/stores/chat';
import { ChatMode } from '~/lib/replay/SendChatMessage';

interface PlanViewProps {
  appSummary: AppSummary | null;
}

function appSummaryHasPendingFeature(appSummary: AppSummary | null) {
  return (
    appSummary?.features?.length &&
    appSummary.features.some(
      (feature) => feature.status != AppFeatureStatus.Validated && feature.status != AppFeatureStatus.ValidationFailed,
    )
  );
}

const PlanView = ({ appSummary }: PlanViewProps) => {
  const listenResponses = useStore(chatStore.listenResponses);

  return (
    <div className="relative h-full w-full">
      <div className="h-full overflow-auto bg-transparent p-6">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <div className="flex-1">
            <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">App Build Plan</div>
            {!listenResponses && appSummaryHasPendingFeature(appSummary) && (
              <button
                className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors duration-200 w-full text-left cursor-pointer"
                onClick={(event) => {
                  event.preventDefault();
                  doSendMessage(ChatMode.DevelopApp, []);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="i-ph:rocket-launch text-xl text-blue-600"></div>
                  <div>
                    <div className="font-medium text-blue-900">Continue Building</div>
                  </div>
                </div>
              </button>
            )}
            {listenResponses && appSummary?.features?.length && (
              <button
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200 w-full text-left cursor-pointer"
                onClick={(event) => {
                  event.preventDefault();
                  doAbortChat();
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="i-ph:stop-circle-bold text-xl text-red-600"></div>
                  <div>
                    <div className="font-medium text-red-900">Building in Progress</div>
                  </div>
                </div>
              </button>
            )}
            <div className="mb-8">
              <div className="text-lg font-semibold mb-3 text-bolt-elements-textPrimary">Project Description</div>
              <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary?.description}</div>
            </div>
            {appSummary?.pages && <Pages appSummary={appSummary} />}
          </div>
          {(appSummary?.features || appSummary?.mockupStatus) && (
            <div className="mt-auto">
              <Features appSummary={appSummary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanView;
