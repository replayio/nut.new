import { useStore } from '@nanostores/react';
import { pendingMessageStatusStore } from '~/lib/stores/status';

const ProgressStatus = () => {
  const status = useStore(pendingMessageStatusStore);

  return (
    <div className="max-w-2xl w-full mx-auto p-8 rounded-xl bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex flex-col items-center text-center space-y-6">
        <h3 className="text-xl font-semibold text-bolt-elements-textHeading leading-relaxed">{status}</h3>
        <div className="relative">
          <div className="w-10 h-10 border-2 border-bolt-elements-borderColor/30 border-t-blue-500 rounded-full animate-spin shadow-sm" />
          <div
            className="absolute inset-0 w-10 h-10 border-2 border-transparent border-t-blue-300/50 rounded-full animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressStatus;
