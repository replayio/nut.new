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
  const completedFeatures = appSummary?.features?.filter(
    (feature) => feature.status === AppFeatureStatus.Validated,
  ).length;
  const totalFeatures = appSummary?.features?.length;
  const isFullyComplete = completedFeatures === totalFeatures && totalFeatures && totalFeatures > 0;

  return (
    <div className="relative h-full w-full">
      <div className="h-full overflow-auto bg-transparent p-6">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <div className="flex-1">
            <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">App Build Plan</div>
            {!listenResponses && appSummaryHasPendingFeature(appSummary) && !isFullyComplete && (
              <div className="flex justify-center items-center">
                <button
                  className="mb-6 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 text-left cursor-pointer"
                  onClick={(event) => {
                    event.preventDefault();
                    doSendMessage(ChatMode.DevelopApp, []);
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="i-ph:rocket-launch text-xl text-white"></div>
                    <div>
                      <div className="font-medium text-white">Continue Building</div>
                    </div>
                  </div>
                </button>
              </div>
            )}
            {listenResponses && appSummary?.features?.length && (
              <div className="flex justify-center items-center">
                <button
                  className="mb-6 p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 text-left cursor-pointer"
                  onClick={(event) => {
                    event.preventDefault();
                    doAbortChat();
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div className="i-ph:stop-circle-bold text-xl text-white"></div>
                    <div>
                      <div className="font-medium text-white">Build in Progress (Click to Stop)</div>
                    </div>
                  </div>
                </button>
              </div>
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
