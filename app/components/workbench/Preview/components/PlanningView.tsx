import { classNames } from "~/utils/classNames";
import type { AppSummary } from "~/lib/persistence/messageAppSummary";

const PlanningView = ({ appSummary }: { appSummary: AppSummary | null }) => {
    if (!appSummary) {
      return (
        <div className="h-full overflow-auto bg-transparent p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 mb-6 bg-bolt-elements-background-depth-2 rounded-full flex items-center justify-center">
                <div className="text-2xl">📋</div>
              </div>
              <div className="text-2xl font-bold mb-4 text-bolt-elements-textPrimary">Planning</div>
              <div className="text-bolt-elements-textSecondary mb-8 max-w-md">
                Start planning your project by describing what you want to build. As you chat with the assistant, 
                your project description and features will appear here.
              </div>
              <div className="text-sm text-bolt-elements-textSecondary">
                💡 Try asking: "Help me build a todo app with React"
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto bg-transparent p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">Planning</div>
          
          <div className="mb-8">
            <div className="text-lg font-semibold mb-3 text-bolt-elements-textPrimary">Project Description</div>
            <div className="text-bolt-elements-textSecondary leading-relaxed">{appSummary.description}</div>
          </div>

          <div className="mb-8">
            <div className="text-lg font-semibold mb-4 text-bolt-elements-textPrimary">Features</div>
            <div className="space-y-6">
              {appSummary.features.map((feature) => {
                return (
                  <div key={feature.id} className="space-y-3">
                    {/* Feature */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor">
                      <div
                        className={classNames('w-4 h-4 rounded-full border-2', {
                          'bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor': !feature.done,
                          'bg-green-500 border-green-500': feature.done,
                        })}
                      />
                      <div className={classNames('flex-1', {
                        'text-bolt-elements-textSecondary': !feature.done,
                        'text-bolt-elements-textPrimary': feature.done,
                      })}>
                        {feature.description}
                      </div>
                      {feature.done && (
                        <div className="text-green-500 text-sm font-medium">✓ Complete</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
};

export default PlanningView;
