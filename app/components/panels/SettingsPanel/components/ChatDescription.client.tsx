import { useStore } from '@nanostores/react';
import { useEditAppTitle } from '~/lib/hooks/useEditAppTitle';
import { chatStore } from '~/lib/stores/chat';
import { AppAccessKind, isAppAccessAllowed } from '~/lib/api/permissions';
import { isAppOwnerStore } from '~/lib/stores/permissions';
import { userStore } from '~/lib/stores/auth';
import { permissionsStore } from '~/lib/stores/permissions';

export function ChatDescription() {
  const initialTitle = useStore(chatStore.appTitle);
  const appId = useStore(chatStore.currentAppId);
  const permissions = useStore(permissionsStore);
  const isAppOwner = useStore(isAppOwnerStore);
  const user = useStore(userStore);

  const { editing, handleChange, handleSubmit, handleKeyDown, currentTitle, toggleEditMode } = useEditAppTitle({
    initialTitle,
  });

  const canEdit = appId && isAppAccessAllowed(permissions, AppAccessKind.SetTitle, user?.email ?? '', isAppOwner);

  if (!initialTitle) {
    return null;
  }

  return (
    <div className="w-full">
      {editing ? (
        <input
          type="text"
          className="w-full h-9 px-3 py-1 text-sm bg-background text-bolt-elements-textPrimary rounded-md border border-input shadow-sm focus:border-bolt-elements-focus focus:outline-none focus:ring-1 focus:ring-bolt-elements-focus/20 transition-all"
          autoFocus
          value={currentTitle}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder="Project Name"
        />
      ) : (
        <div
          className={`w-full h-9 px-3 py-1 flex items-center text-sm bg-background text-bolt-elements-textPrimary rounded-md border border-input shadow-sm transition-all ${
            canEdit ? 'cursor-text hover:border-bolt-elements-focus/50' : ''
          }`}
          onClick={canEdit ? toggleEditMode : undefined}
        >
          <span className="truncate">{currentTitle || 'Project Name'}</span>
        </div>
      )}
    </div>
  );
}
