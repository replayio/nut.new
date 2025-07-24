import { useStore } from '@nanostores/react';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import WithTooltip from '~/components/ui/Tooltip';

interface HeaderActionButtonsProps {}

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const showChat = useStore(chatStore.showChat);

  const isSmallViewport = useViewport(1024);

  const canHideChat = showWorkbench || !showChat;

  return (
    <TooltipProvider>
      <div className="flex">
        {!isSmallViewport && (
          <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden">
            <Button
              active={showChat}
              disabled={!canHideChat || isSmallViewport} // expand button is disabled on mobile as it's not needed
              onClick={() => {
                if (canHideChat) {
                  chatStore.showChat.set(!showChat);
                }
              }}
            >
              <WithTooltip tooltip="Open Chat">
                <div className="i-bolt:chat text-xl" />
              </WithTooltip>
            </Button>
            <div className="w-[1px] bg-bolt-elements-borderColor" />
            <Button
              active={showWorkbench}
              onClick={() => {
                if (showWorkbench && !showChat) {
                  chatStore.showChat.set(true);
                }

                workbenchStore.showWorkbench.set(!showWorkbench);
              }}
            >
              <WithTooltip tooltip="Open Preview">
                <div className="i-ph:desktop-bold text-xl" />
              </WithTooltip>
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  children?: any;
  onClick?: VoidFunction;
}

function Button({ active = false, disabled = false, children, onClick }: ButtonProps) {
  return (
    <button
      className={classNames('flex items-center p-2.5', {
        'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary':
          !active,
        'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent': active && !disabled,
        'bg-bolt-elements-item-backgroundDefault text-alpha-gray-20 dark:text-alpha-white-20 cursor-not-allowed':
          disabled,
      })}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
