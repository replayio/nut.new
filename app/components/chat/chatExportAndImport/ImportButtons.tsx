import { ImportFolderButton } from '~/components/chat/ImportFolderButton';
import type { Message } from '~/lib/persistence/message';

export function ImportButtons(importChat: ((description: string, messages: Message[]) => Promise<void>) | undefined) {
  return (
    <div className="flex flex-col items-center justify-center w-auto">
      <div className="flex flex-col items-center gap-4 max-w-2xl text-center">
        <div className="flex gap-2">
          <ImportFolderButton
            importChat={importChat}
            className="px-4 py-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition-all flex items-center gap-2"
          />
        </div>
      </div>
    </div>
  );
}
