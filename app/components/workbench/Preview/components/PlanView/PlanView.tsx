import { AppFeatureStatus, type AppSummary } from '~/lib/persistence/messageAppSummary';
import Pages from './components/Pages';
import Secrets from './components/Secrets';
import Features from './components/Features/Features';
import { useStore } from '@nanostores/react';
import { chatStore, doAbortChat, doSendMessage } from '~/lib/stores/chat';
import { ChatMode } from '~/lib/replay/SendChatMessage';
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

  const completedFeatures = appSummary?.features?.filter(
    (feature) => feature.status === AppFeatureStatus.Validated,
  ).length;
  const totalFeatures = appSummary?.features?.length;
  const isFullyComplete = completedFeatures === totalFeatures && totalFeatures && totalFeatures > 0;
  const peanutsError = useStore(peanutsStore.peanutsError);
  const hasSecrets = appSummary?.features?.some((f) => f.secrets?.length);

  return (
    <div className="relative h-full w-full">
      <div className="h-full overflow-auto bg-bolt-elements-background-depth-1/50 p-6">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <div>
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
            <div className="mb-8 p-4 bg-bolt-elements-background-depth-2/50 rounded-xl border border-bolt-elements-borderColor/50">
              <div className="text-lg font-semibold mb-3 text-bolt-elements-textHeading">Project Description</div>
              <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary?.description}</div>
            </div>
            {hasSecrets && <Secrets appSummary={appSummary!} />}
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
