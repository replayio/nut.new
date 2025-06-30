import { useStore } from '@nanostores/react';
import { pendingMessageStatusStore } from '~/lib/stores/status';

const StatusProgress = () => {
  const status = useStore(pendingMessageStatusStore);

  return (
    <div className="max-w-2xl w-full mx-auto p-8 rounded-lg bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-6">{status}</h3>
        <div className="w-8 h-8 relative flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-bolt-elements-borderColor border-t-green-500 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
};

export default StatusProgress;
