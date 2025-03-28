import { useStore } from '@nanostores/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { currentChatId, currentChatTitle, getChatContents, updateChatTitle } from '~/lib/persistence';

interface EditChatDescriptionOptions {
  initialTitle?: string;
  customChatId?: string;
  syncWithGlobalStore?: boolean;
}

type EditChatDescriptionHook = {
  editing: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: () => Promise<void>;
  handleSubmit: (event: React.FormEvent) => Promise<void>;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => Promise<void>;
  currentTitle: string;
  toggleEditMode: () => void;
};

/**
 * Hook to manage the state and behavior for editing chat descriptions.
 *
 * Offers functions to:
 * - Switch between edit and view modes.
 * - Manage input changes, blur, and form submission events.
 * - Save updates to IndexedDB and optionally to the global application state.
 *
 * @param {Object} options
 * @param {string} options.initialDescription - The current chat description.
 * @param {string} options.customChatId - Optional ID for updating the description via the sidebar.
 * @param {boolean} options.syncWithGlobalStore - Flag to indicate global description store synchronization.
 * @returns {EditChatDescriptionHook} Methods and state for managing description edits.
 */
export function useEditChatTitle({
  initialTitle = currentChatTitle.get()!,
  customChatId,
  syncWithGlobalStore,
}: EditChatDescriptionOptions): EditChatDescriptionHook {
  const chatIdFromStore = useStore(currentChatId);
  const [editing, setEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(initialTitle);

  const [chatId, setChatId] = useState<string>();

  useEffect(() => {
    setChatId(customChatId || chatIdFromStore);
  }, [customChatId, chatIdFromStore]);
  useEffect(() => {
    setCurrentTitle(initialTitle);
  }, [initialTitle]);

  const toggleEditMode = useCallback(() => setEditing((prev) => !prev), []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTitle(e.target.value);
  }, []);

  const fetchLatestTitle = useCallback(async () => {
    if (!chatId) {
      return initialTitle;
    }

    try {
      const chat = await getChatContents(chatId);
      return chat?.title || initialTitle;
    } catch (error) {
      console.error('Failed to fetch latest description:', error);
      return initialTitle;
    }
  }, [chatId, initialTitle]);

  const handleBlur = useCallback(async () => {
    const latestTitle = await fetchLatestTitle();
    setCurrentTitle(latestTitle);
    toggleEditMode();
  }, [fetchLatestTitle, toggleEditMode]);

  const isValidTitle = useCallback((title: string): boolean => {
    const trimmedTitle = title.trim();

    if (trimmedTitle === initialTitle) {
      toggleEditMode();
      return false; // No change, skip validation
    }

    const lengthValid = trimmedTitle.length > 0 && trimmedTitle.length <= 100;

    // Allow letters, numbers, spaces, and common punctuation but exclude characters that could cause issues
    const characterValid = /^[a-zA-Z0-9\s\-_.,!?()[\]{}'"]+$/.test(trimmedTitle);

    if (!lengthValid) {
      toast.error('Title must be between 1 and 100 characters.');
      return false;
    }

    if (!characterValid) {
      toast.error('Title can only contain letters, numbers, spaces, and basic punctuation.');
      return false;
    }

    return true;
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!isValidTitle(currentTitle)) {
        return;
      }

      try {
        if (!chatId) {
          toast.error('Chat Id is not available');
          return;
        }

        await updateChatTitle(chatId, currentTitle);

        if (syncWithGlobalStore) {
          currentChatTitle.set(currentTitle);
        }

        toast.success('Chat title updated successfully');
      } catch (error) {
        toast.error('Failed to update chat title: ' + (error as Error).message);
      }

      toggleEditMode();
    },
    [currentTitle, chatId, customChatId],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        await handleBlur();
      }
    },
    [handleBlur],
  );

  return {
    editing,
    handleChange,
    handleBlur,
    handleSubmit,
    handleKeyDown,
    currentTitle,
    toggleEditMode,
  };
}
