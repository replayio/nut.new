import { AppFeatureStatus, type AppSummary } from '~/lib/persistence/messageAppSummary';
import Pages from './components/Pages';
import Features from './components/Features/Features';
import { useStore } from '@nanostores/react';
import { chatStore, doAbortChat, doSendMessage } from '~/lib/stores/chat';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { useState } from 'react';
import AppHistory from './AppHistory';
import { peanutsStore } from '~/lib/stores/peanuts';
import WithTooltip from '~/components/ui/Tooltip';

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
  const appId = useStore(chatStore.currentAppId);
  const [historyOpen, setHistoryOpen] = useState(false);

  const completedFeatures = appSummary?.features?.filter(
    (feature) => feature.status === AppFeatureStatus.Validated,
  ).length;
  const totalFeatures = appSummary?.features?.length;
  const isFullyComplete = completedFeatures === totalFeatures && totalFeatures && totalFeatures > 0;
  const peanutsError = useStore(peanutsStore.peanutsError);

  if (historyOpen) {
    return (
      <div className="relative h-full w-full">
        <div className="absolute top-4 left-4 z-10">
          <button
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 group"
            onClick={(event) => {
              event.preventDefault();
              setHistoryOpen(false);
            }}
          >
            <div className="i-ph:arrow-left text-lg transition-transform duration-200 group-hover:scale-110"></div>
            <span className="font-medium transition-transform duration-200 group-hover:scale-105">
              Back to Build Plan
            </span>
          </button>
        </div>
        <div className="pt-16">{appId && <AppHistory appId={appId} />}</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="h-full overflow-auto bg-bolt-elements-background-depth-1/50 p-6">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <div>
            <div className="text-3xl font-bold mb-8 text-bolt-elements-textHeading">App Build Plan</div>
            {!listenResponses && appSummaryHasPendingFeature(appSummary) && !isFullyComplete && (
              <div className="flex justify-center items-center">
                <WithTooltip tooltip={peanutsError ?? 'Continue Building Your App!'}>
                  <button
                    className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 text-left cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
                    onClick={(event) => {
                      event.preventDefault();
                      doSendMessage(ChatMode.DevelopApp, []);
                    }}
                    disabled={!!peanutsError}
                  >
                    <div className="flex items-center gap-2">
                      <div className="i-ph:rocket-launch text-xl text-white transition-transform duration-200 group-hover:scale-110"></div>
                      <div className="font-medium text-white transition-transform duration-200 group-hover:scale-105">
                        Continue Building
                      </div>
                    </div>
                  </button>
                </WithTooltip>
              </div>
            )}
            {listenResponses && appSummary?.features?.length && (
              <div className="flex justify-center items-center">
                <button
                  className="mb-6 p-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl transition-all duration-200 text-left cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
                  onClick={(event) => {
                    event.preventDefault();
                    doAbortChat();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="i-ph:stop-circle-bold text-xl text-white transition-transform duration-200 group-hover:scale-110"></div>
                    <div className="font-medium text-white transition-transform duration-200 group-hover:scale-105">
                      Build in Progress (Click to Stop)
                    </div>
                  </div>
                </button>
              </div>
            )}
            {appId && (
              <div className="flex justify-center items-center">
                <button
                  className="mb-6 p-3 bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary rounded-xl transition-all duration-200 text-left cursor-pointer shadow-sm hover:shadow-md hover:scale-105 border border-bolt-elements-borderColor group"
                  onClick={(event) => {
                    event.preventDefault();
                    setHistoryOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="i-ph:list-bold text-xl transition-transform duration-200 group-hover:scale-110"></div>
                    <div className="font-medium transition-transform duration-200 group-hover:scale-105">
                      View Version History
                    </div>
                  </div>
                </button>
              </div>
            )}
            <div className="mb-8 p-4 bg-bolt-elements-background-depth-2/50 rounded-xl border border-bolt-elements-borderColor/50">
              <div className="text-lg font-semibold mb-3 text-bolt-elements-textHeading">Project Description</div>
              <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary?.description}</div>
            </div>
            {appSummary?.pages && <Pages appSummary={appSummary} />}
          </div>
          {(appSummary?.features || appSummary?.mockupStatus) && (
            <div>
              <Features appSummary={appSummary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanView;
