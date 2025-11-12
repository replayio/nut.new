import { Menu, Check } from '~/components/ui/Icon';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import { useEditAppTitle } from '~/lib/hooks/useEditAppTitle';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import { AppAccessKind, isAppAccessAllowed } from '~/lib/api/permissions';
import { isAppOwnerStore } from '~/lib/stores/permissions';
import { userStore } from '~/lib/stores/userAuth';
import { permissionsStore } from '~/lib/stores/permissions';
import { useState } from 'react';
import {
  DialogRoot,
  DialogButton,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/Dialog';
import * as RadixDialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { dialogBackdropVariants, dialogVariants } from '~/components/ui/Dialog';

export function FloatingChatToolbar() {
  const initialTitle = useStore(chatStore.appTitle);
  const appId = useStore(chatStore.currentAppId);
  const permissions = useStore(permissionsStore);
  const isAppOwner = useStore(isAppOwnerStore);
  const user = useStore(userStore.user);

  const { editing, handleChange, handleSubmit, handleKeyDown, currentTitle, toggleEditMode } = useEditAppTitle({
    initialTitle,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const canEditTitle =
    appId && isAppAccessAllowed(permissions, AppAccessKind.SetTitle, user?.email ?? '', isAppOwner);

  const handleBlur = (e: React.FocusEvent) => {
    // Don't show dialog if clicking the save button
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest('[data-save-button]')) {
      return;
    }

    // Check if title has changed
    if (currentTitle !== initialTitle) {
      setShowConfirmDialog(true);
    } else {
      toggleEditMode();
    }
  };

  const handleSave = () => {
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSubmit(fakeEvent);
    setShowConfirmDialog(false);
  };

  const handleDiscard = () => {
    // Reset title to initial value
    handleChange({ target: { value: initialTitle } } as React.ChangeEvent<HTMLInputElement>);
    toggleEditMode();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div className="bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor border-opacity-50 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-1">
          {/* Menu Button */}
          <button
            onClick={() => sidebarMenuStore.toggle()}
            className="p-1.5 rounded-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-all duration-200 flex-shrink-0"
            title="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Editable Title */}
          {editing ? (
            <div className="h-[30px] flex items-center gap-2 flex-1 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md px-2.5 py-1 text-xs focus-within:bg-bolt-elements-background-depth-3 focus-within:border-blue-500/50 transition-all duration-200">
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-bolt-elements-textSecondary focus:text-bolt-elements-textPrimary"
                autoFocus
                value={currentTitle}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder="Enter chat title..."
              />
              <TooltipProvider>
                <WithTooltip tooltip="Save title">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    data-save-button
                    className="p-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition-all duration-200 flex-shrink-0"
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                </WithTooltip>
              </TooltipProvider>
            </div>
          ) : (
            <button
              onClick={canEditTitle ? toggleEditMode : undefined}
              disabled={!canEditTitle}
              className={`h-[30px] flex items-center gap-2 flex-1 min-w-0 rounded-md px-2.5 py-1 text-xs transition-all duration-200 ${
                canEditTitle
                  ? 'hover:bg-bolt-elements-background-depth-2 hover:border hover:border-bolt-elements-borderColor cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="flex-1 text-bolt-elements-textSecondary truncate text-left">
                {currentTitle || 'New Chat'}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <DialogRoot open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay asChild>
            <motion.div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              initial="closed"
              animate="open"
              exit="closed"
              variants={dialogBackdropVariants}
            />
          </RadixDialog.Overlay>
          <RadixDialog.Content asChild>
            <motion.div
              className="fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-md bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg focus:outline-none"
              initial="closed"
              animate="open"
              exit="closed"
              variants={dialogVariants}
            >
              <DialogTitle>Save Changes?</DialogTitle>
              <DialogDescription>Do you want to save the changes to the chat title?</DialogDescription>
              <div className="flex justify-end gap-3 px-5 py-4 border-t border-bolt-elements-borderColor">
                <DialogButton type="secondary" onClick={handleDiscard}>
                  Discard
                </DialogButton>
                <DialogButton type="primary" onClick={handleSave}>
                  Save
                </DialogButton>
              </div>
            </motion.div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </DialogRoot>
    </>
  );
}
