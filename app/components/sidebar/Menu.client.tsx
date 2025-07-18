import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { SettingsWindow } from '~/components/settings/SettingsWindow';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { database, type ChatSummary } from '~/lib/persistence/chats';
import { chatStore } from '~/lib/stores/chat';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import Cookies from 'js-cookie';
import Feedback from './Feedback/FeedbackButton';

const menuVariants = {
  closed: {
    opacity: 0,
    visibility: 'hidden',
    left: '-150px',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    opacity: 1,
    visibility: 'initial',
    left: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

type DialogContent = { type: 'delete'; item: ChatSummary } | null;

const skipConfirmDeleteCookieName = 'skipConfirmDelete';

export const Menu = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<ChatSummary[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [skipConfirmDeleteChecked, setSkipConfirmDeleteChecked] = useState(false);

  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list ?? [],
    searchFields: ['title'],
  });

  const loadEntries = useCallback(() => {
    setList(null);
    database
      .getAllChats()
      .then(setList)
      .catch((error) => toast.error(error.message));
  }, []);

  const deleteItem = useCallback(
    (event: React.UIEvent, item: ChatSummary) => {
      event.preventDefault();

      // Optimistically remove the item from the list while we update the database.
      setList((list ?? []).filter((chat) => chat.id !== item.id));

      database
        .deleteChat(item.id)
        .then(() => {
          loadEntries();

          if (chatStore.currentChat.get()?.id === item.id) {
            // hard page navigation to clear the stores
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete conversation');
          logger.error(error);
        });
    },
    [list],
  );

  const closeDialog = () => {
    setDialogContent(null);
    setSkipConfirmDeleteChecked(false);
  };

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open]);

  useEffect(() => {
    const enterThreshold = 40;
    const exitThreshold = 40;

    function onMouseMove(event: MouseEvent) {
      if (event.pageX < enterThreshold) {
        setOpen(true);
      }

      if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
        setOpen(false);
      }
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  const handleDeleteClick = (event: React.UIEvent, item: ChatSummary) => {
    event.preventDefault();

    const skipConfirmDelete = Cookies.get(skipConfirmDeleteCookieName);

    if (skipConfirmDelete === 'true') {
      deleteItem(event, item);
    } else {
      setDialogContent({ type: 'delete', item });
    }
  };

  return (
    <motion.div
      ref={menuRef}
      initial="closed"
      animate={open ? 'open' : 'closed'}
      variants={menuVariants}
      className="flex selection-accent flex-col side-menu fixed top-0 w-[350px] h-full bg-bolt-elements-background-depth-2 border-r rounded-r-3xl border-bolt-elements-borderColor z-sidebar shadow-xl shadow-bolt-elements-sidebar-dropdownShadow text-sm"
    >
      <div className="h-[55px]" /> {/* Spacer for top margin */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <div className="flex gap-2 px-2 mb-0 ml-2.5">
          <a
            href="/about"
            className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
          >
            About
          </a>
        </div>
        <div className="p-4 select-none">
          <a
            href="/"
            className="flex gap-2 items-center bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme mb-4"
          >
            <span className="inline-block i-bolt:chat scale-110" />
            Start new chat
          </a>
          <div className="relative w-full">
            <input
              className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor"
              type="search"
              placeholder="Search"
              onChange={handleSearchChange}
              aria-label="Search chats"
            />
          </div>
        </div>
        <div className="text-bolt-elements-textPrimary font-medium pl-6 pr-5 my-2">Your Chats</div>
        <div className="flex-1 overflow-auto pl-4 pr-5 pb-5">
          {filteredList.length === 0 && (
            <div className="pl-2 text-bolt-elements-textTertiary">
              {list ? (list.length === 0 ? 'No previous conversations' : 'No matches found') : 'Loading...'}
            </div>
          )}
          <DialogRoot open={dialogContent !== null}>
            {binDates(filteredList).map(({ category, items }) => (
              <div key={category} className="mt-4 first:mt-0 space-y-1">
                <div className="text-bolt-elements-textTertiary sticky top-0 z-1 bg-bolt-elements-background-depth-2 pl-2 pt-2 pb-1">
                  {category}
                </div>
                {items.map((item) => (
                  <HistoryItem key={item.id} item={item} onDelete={(event) => handleDeleteClick(event, item)} />
                ))}
              </div>
            ))}
            <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
              {dialogContent?.type === 'delete' && (
                <>
                  <DialogTitle>Delete Chat?</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      <p>
                        You are about to delete <strong>{dialogContent.item.title}</strong>.
                      </p>
                      <p className="mt-1">Are you sure you want to delete this chat?</p>
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="skipConfirmDelete"
                          checked={skipConfirmDeleteChecked}
                          onChange={(e) => {
                            setSkipConfirmDeleteChecked(e.target.checked);
                          }}
                        />
                        <label htmlFor="skipConfirmDelete" className="text-sm">
                          Don't ask me again
                        </label>
                      </div>
                    </div>
                  </DialogDescription>
                  <div className="px-5 pb-4 bg-bolt-elements-background-depth-2 flex gap-2 justify-end">
                    <DialogButton type="secondary" onClick={closeDialog}>
                      Cancel
                    </DialogButton>
                    <DialogButton
                      type="danger"
                      onClick={(event) => {
                        deleteItem(event, dialogContent.item);
                        closeDialog();
                        if (skipConfirmDeleteChecked) {
                          Cookies.set(skipConfirmDeleteCookieName, 'true');
                        }
                      }}
                    >
                      Delete
                    </DialogButton>
                  </div>
                </>
              )}
            </Dialog>
          </DialogRoot>
        </div>
        <div className="flex items-center justify-between border-t border-bolt-elements-borderColor p-4">
          <SettingsButton onClick={() => setIsSettingsOpen(true)} />
          <Feedback />
          <ThemeSwitch />
        </div>
      </div>
      <SettingsWindow open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </motion.div>
  );
};
