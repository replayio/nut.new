import { useStore } from '@nanostores/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import { useEditAppTitle } from '~/lib/hooks/useEditAppTitle';
import { chatStore } from '~/lib/stores/chat';

export function ChatDescription() {
  const initialTitle = useStore(chatStore.appTitle);

  const { editing, handleChange, handleSubmit, handleKeyDown, currentTitle, toggleEditMode } = useEditAppTitle({
    initialTitle,
  });

  if (!initialTitle) {
    return null;
  }

  return (
    <div className="flex items-center flex-1 min-w-0 max-w-md mx-auto">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center w-full min-w-0 gap-3">
          <input
            type="text"
            className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded-xl px-4 py-2 flex-1 min-w-0 truncate border border-bolt-elements-borderColor focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 shadow-sm hover:shadow-md"
            autoFocus
            value={currentTitle}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter chat title..."
          />
          <TooltipProvider>
            <WithTooltip tooltip="Save title">
              <button
                type="submit"
                onClick={handleSubmit}
                className="p-2.5 rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 group flex-shrink-0"
              >
                <div className="i-ph:check-bold text-lg transition-transform duration-200 bg-green-600 rounded-full group-hover:scale-110" />
              </button>
            </WithTooltip>
          </TooltipProvider>
        </form>
      ) : (
        <div className="flex items-center justify-center w-full min-w-0">
          <div className="text-center text-bolt-elements-textHeading font-medium px-2 truncate max-w-full">
            {currentTitle}
          </div>
          <TooltipProvider>
            <WithTooltip tooltip="Rename chat">
              <button
                type="button"
                className="p-2.5 rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 group flex-shrink-0"
                onClick={(event) => {
                  event.preventDefault();
                  toggleEditMode();
                }}
              >
                <div className="i-ph:pencil-fill text-lg transition-transform duration-200 group-hover:scale-110" />
              </button>
            </WithTooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
