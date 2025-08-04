import { useStore } from '@nanostores/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import { useEditChatTitle } from '~/lib/hooks/useEditChatDescription';
import { chatStore } from '~/lib/stores/chat';

export function ChatDescription() {
  const initialTitle = useStore(chatStore.appTitle);

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentTitle, toggleEditMode } =
    useEditChatTitle({
      initialTitle,
    });

  if (!initialTitle) {
    // doing this to prevent showing edit button until chat description is set
    return null;
  }

  return (
    <div className="flex items-center justify-center w-full min-w-20">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center justify-center w-full min-w-0">
          <input
            type="text"
            className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 mr-2 flex-1 min-w-0 truncate"
            autoFocus
            value={currentTitle}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          <TooltipProvider>
            <WithTooltip tooltip="Save title">
              <div className="flex justify-between items-center p-2 rounded-md bg-bolt-elements-item-backgroundAccent flex-shrink-0">
                <button
                  type="submit"
                  className="i-ph:check-bold scale-110 hover:text-bolt-elements-item-contentAccent"
                  onMouseDown={handleSubmit}
                />
              </div>
            </WithTooltip>
          </TooltipProvider>
        </form>
      ) : (
        <>
          <div className="flex-1 min-w-0 truncate text-center text-bolt-elements-textPrimary">{currentTitle}</div>
          <TooltipProvider>
            <WithTooltip tooltip="Rename chat">
              <div className="flex justify-between items-center p-2 rounded-md bg-bolt-elements-item-backgroundAccent ml-2 flex-shrink-0">
                <button
                  type="button"
                  className="i-ph:pencil-fill scale-110 text-bolt-elements-textPrimary hover:text-bolt-elements-item-contentAccent"
                  onClick={(event) => {
                    event.preventDefault();
                    toggleEditMode();
                  }}
                />
              </div>
            </WithTooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  );
}
