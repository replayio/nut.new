import { useParams } from '@remix-run/react';
import { classNames } from '~/utils/classNames';
import * as Dialog from '@radix-ui/react-dialog';
import { type ChatSummary } from '~/lib/persistence/chats';
import WithTooltip from '~/components/ui/Tooltip';
import { useEditChatTitle } from '~/lib/hooks/useEditChatDescription';
import { forwardRef, type ForwardedRef } from 'react';

interface HistoryItemProps {
  item: ChatSummary;
  onDelete?: (event: React.UIEvent) => void;
  onDuplicate?: (id: string) => void;
}

export function HistoryItem({ item, onDelete, onDuplicate }: HistoryItemProps) {
  const { id: urlId } = useParams();
  const isActiveChat = urlId === item.id;

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentTitle, toggleEditMode } =
    useEditChatTitle({
      initialTitle: item.title,
      customChatId: item.id,
    });

  const renderDescriptionForm = (
    <form onSubmit={handleSubmit} className="flex-1 flex items-center">
      <input
        type="text"
        className="flex-1 bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 mr-2"
        autoFocus
        value={currentTitle}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className="i-ph:check scale-110 hover:text-bolt-elements-item-contentAccent"
        onMouseDown={handleSubmit}
      />
    </form>
  );

  return (
    <div
      className={classNames(
        'group rounded-md text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 overflow-hidden flex justify-between items-center px-2 py-1',
        { '[&&]:text-bolt-elements-textPrimary bg-bolt-elements-background-depth-3': isActiveChat },
      )}
    >
      {editing ? (
        renderDescriptionForm
      ) : (
        <a href={`/chat/${item.id}`} className="flex w-full relative truncate block">
          {item.title}
          <div
            className={classNames(
              'absolute right-0 z-1 top-0 bottom-0 bg-gradient-to-l from-bolt-elements-background-depth-2 group-hover:from-bolt-elements-background-depth-3 box-content pl-3 to-transparent w-10 flex justify-end group-hover:w-22 group-hover:from-99%',
              { 'from-bolt-elements-background-depth-3 w-10 ': isActiveChat },
            )}
          >
            <div className="flex items-center p-1 text-bolt-elements-textSecondary opacity-0 group-hover:opacity-100 transition-opacity">
              {onDuplicate && (
                <ChatActionButton
                  toolTipContent="Duplicate chat"
                  icon="i-ph:copy"
                  onClick={() => onDuplicate?.(item.id)}
                />
              )}
              <ChatActionButton
                toolTipContent="Rename chat"
                icon="i-ph:pencil-fill"
                onClick={(event) => {
                  event.preventDefault();
                  toggleEditMode();
                }}
              />
              <Dialog.Trigger asChild>
                <ChatActionButton
                  toolTipContent="Delete chat"
                  icon="i-ph:trash"
                  className="[&&]:hover:text-bolt-elements-button-danger-text"
                  onClick={(event) => {
                    event.preventDefault();
                    onDelete?.(event);
                  }}
                />
              </Dialog.Trigger>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

const ChatActionButton = forwardRef(
  (
    {
      toolTipContent,
      icon,
      className,
      onClick,
    }: {
      toolTipContent: string;
      icon: string;
      className?: string;
      onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
      btnTitle?: string;
    },
    ref: ForwardedRef<HTMLButtonElement>,
  ) => {
    return (
      <WithTooltip tooltip={toolTipContent}>
        <button
          ref={ref}
          type="button"
          className={`scale-110 mr-2 hover:text-bolt-elements-item-contentAccent ${icon} ${className ? className : ''}`}
          onClick={onClick}
        />
      </WithTooltip>
    );
  },
);
