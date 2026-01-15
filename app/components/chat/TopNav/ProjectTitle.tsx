import { useStore } from '@nanostores/react';
import { useEditAppTitle } from '~/lib/hooks/useEditAppTitle';
import { chatStore } from '~/lib/stores/chat';
import { AppAccessKind, isAppAccessAllowed } from '~/lib/api/permissions';
import { isAppOwnerStore, permissionsStore } from '~/lib/stores/permissions';
import { userStore } from '~/lib/stores/auth';
import { Check, PenLine } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';

export function ProjectTitle() {
  const initialTitle = useStore(chatStore.appTitle);
  const appId = useStore(chatStore.currentAppId);
  const permissions = useStore(permissionsStore);
  const isAppOwner = useStore(isAppOwnerStore);
  const user = useStore(userStore);

  const { editing, handleChange, handleSubmit, handleKeyDown, currentTitle, toggleEditMode } = useEditAppTitle({
    initialTitle,
  });

  if (!initialTitle) {
    return null;
  }

  const canEdit = appId && isAppAccessAllowed(permissions, AppAccessKind.SetTitle, user?.email ?? '', isAppOwner);

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {editing ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            className="flex-1 min-w-0 h-9 max-w-[50%] px-3 text-sm font-medium bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded-md border border-bolt-elements-borderColor focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            autoFocus
            value={currentTitle}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Project name..."
          />
          <TooltipProvider>
            <WithTooltip tooltip="Save">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSubmit}
                className="h-9 w-9 shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
              >
                <Check size={16} strokeWidth={2.5} />
              </Button>
            </WithTooltip>
          </TooltipProvider>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          <span
           className="text-sm font-medium text-bolt-elements-textPrimary truncate max-w-[200px]"
           onClick={toggleEditMode}
           >
            {currentTitle}
          </span>
        </div>
      )}
    </div>
  );
}
