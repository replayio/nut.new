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
    <div className="flex items-center justify-center max-w-400">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center justify-center">
          <input
            type="text"
            className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 mr-2 w-fit text-ellipsis"
            autoFocus
            value={currentTitle}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: `${Math.min(Math.max(currentTitle.length * 8, 100), 400)}px`,
              maxWidth: '400px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          />
          <TooltipProvider>
            <WithTooltip tooltip="Save title">
              <div className="flex justify-between items-center p-2 rounded-md bg-bolt-elements-item-backgroundAccent">
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
          <div className="max-w-[400px] truncate">{currentTitle}</div>
          <TooltipProvider>
            <WithTooltip tooltip="Rename chat">
              <div className="flex justify-between items-center p-2 rounded-md bg-bolt-elements-item-backgroundAccent ml-2">
                <button
                  type="button"
                  className="i-ph:pencil-fill scale-110 hover:text-bolt-elements-item-contentAccent"
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
