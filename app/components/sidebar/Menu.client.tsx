import { motion, type Variants } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';
import { SettingsWindow } from '~/components/settings/SettingsWindow';
import { SettingsButton } from '~/components/ui/SettingsButton';
import { database, type AppLibraryEntry } from '~/lib/persistence/apps';
import { chatStore } from '~/lib/stores/chat';
import { cubicEasingFn } from '~/utils/easings';
import { logger } from '~/utils/logger';
import { HistoryItem } from './HistoryItem';
import { binDates } from './date-binning';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import Cookies from 'js-cookie';
import Feedback from './Feedback/FeedbackButton';
import { useStore } from '@nanostores/react';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import useViewport from '~/lib/hooks';

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

type DialogContent = { type: 'delete'; item: AppLibraryEntry } | null;

const skipConfirmDeleteCookieName = 'skipConfirmDelete';

export const Menu = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<AppLibraryEntry[] | null>(null);
  const isOpen = useStore(sidebarMenuStore.isOpen);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [skipConfirmDeleteChecked, setSkipConfirmDeleteChecked] = useState(false);
  const isSmallViewport = useViewport(1024);
  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list ?? [],
    searchFields: ['title'],
  });

  const loadEntries = useCallback(() => {
    setList(null);
    database
      .getAllAppEntries()
      .then(setList)
      .catch((error) => toast.error(error.message));
  }, []);

  const deleteItem = useCallback(
    (event: React.UIEvent, item: AppLibraryEntry) => {
      event.preventDefault();

      setList((list ?? []).filter((chat) => chat.id !== item.id));

      database
        .deleteApp(item.id)
        .then(() => {
          loadEntries();

          if (chatStore.currentAppId.get() === item.id) {
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          toast.error('Failed to delete app');
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
    if (isOpen) {
      loadEntries();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isSmallViewport) {
      return undefined;
    }

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (event: TouchEvent) => {
      touchStartX = event.changedTouches[0].screenX;
      touchStartY = event.changedTouches[0].screenY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      touchEndX = event.changedTouches[0].screenX;
      touchEndY = event.changedTouches[0].screenY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const minSwipeDistance = 50;
      const maxVerticalDistance = 50;

      if (Math.abs(deltaY) > maxVerticalDistance) {
        return;
      }

      if (deltaX > minSwipeDistance && !isOpen) {
        sidebarMenuStore.open();
      }

      if (deltaX < -minSwipeDistance && isOpen) {
        sidebarMenuStore.close();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSmallViewport, isOpen]);

  useEffect(() => {
    if (isSmallViewport) {
      return undefined;
    }

    const enterThreshold = 40;
    const exitThreshold = 40;

    function onMouseMove(event: MouseEvent) {
      if (event.pageX < enterThreshold) {
        sidebarMenuStore.open();
      }

      if (menuRef.current && event.clientX > menuRef.current.getBoundingClientRect().right + exitThreshold) {
        sidebarMenuStore.close();
      }
    }

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [isSmallViewport, isOpen]);

  const handleDeleteClick = (event: React.UIEvent, item: AppLibraryEntry) => {
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
      animate={isOpen ? 'open' : 'closed'}
      variants={menuVariants}
      className="flex selection-accent flex-col side-menu fixed top-0 w-[350px] h-full bg-bolt-elements-background-depth-2 border-r rounded-r-3xl border-bolt-elements-borderColor z-sidebar shadow-2xl text-sm"
    >
      <div className="h-[55px]" />
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-bolt-elements-borderColor">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-bolt-elements-borderColor p-1">
              <img src="/logo-styled.svg" alt="Nut.new" className="w-full h-full" />
            </div>
            <h1 className="text-bolt-elements-textPrimary font-semibold text-xl">Nut.new</h1>
          </div>

          <div className="space-y-2">
            <a
              href="/"
              className="w-full flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md px-3 py-2 transition-all duration-200 text-sm font-medium"
            >
              <div className="i-ph:plus text-base" />
              <span>New App</span>
            </a>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-bolt-elements-borderColor">
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-bolt-elements-textTertiary">
              <div className="i-ph:magnifying-glass text-lg" />
            </div>
            <input
              className="w-full bg-bolt-elements-background-depth-3 pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary border border-bolt-elements-borderColor transition-all duration-200"
              type="search"
              placeholder="Search apps..."
              onChange={handleSearchChange}
              aria-label="Search apps"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
          <div className="flex items-center gap-2">
            <div className="i-ph:folder text-lg text-bolt-elements-textSecondary" />
            <h3 className="text-bolt-elements-textPrimary font-medium">Your Apps</h3>
            {list && list.length > 0 && (
              <span className="ml-auto text-xs text-bolt-elements-textTertiary bg-bolt-elements-background-depth-3 px-2 py-1 rounded-full">
                {list.length}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto px-6 pb-4">
          {filteredList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {list === null ? (
                <>
                  <div className="w-8 h-8 border-2 border-bolt-elements-textTertiary border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-bolt-elements-textTertiary text-sm">Loading apps...</p>
                </>
              ) : list.length === 0 ? (
                <>
                  <div className="w-12 h-12 bg-bolt-elements-background-depth-3 rounded-full flex items-center justify-center mb-4 border border-bolt-elements-borderColor">
                    <div className="i-ph:folder-open text-xl text-bolt-elements-textTertiary" />
                  </div>
                  <p className="text-bolt-elements-textSecondary font-medium mb-2">No apps yet</p>
                  <p className="text-bolt-elements-textTertiary text-sm">Create your first app to get started</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-bolt-elements-background-depth-3 rounded-full flex items-center justify-center mb-4 border border-bolt-elements-borderColor">
                    <div className="i-ph:magnifying-glass text-xl text-bolt-elements-textTertiary" />
                  </div>
                  <p className="text-bolt-elements-textSecondary font-medium mb-2">No matches found</p>
                  <p className="text-bolt-elements-textTertiary text-sm">Try a different search term</p>
                </>
              )}
            </div>
          )}

          <DialogRoot open={dialogContent !== null}>
            {binDates(filteredList).map(({ category, items }) => (
              <div key={category} className="mb-6 first:mt-0">
                <div className="text-bolt-elements-textTertiary text-xs font-medium uppercase tracking-wider sticky top-0 z-1 bg-bolt-elements-background-depth-2 py-4 mb-3">
                  {category}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <HistoryItem key={item.id} item={item} onDelete={(event) => handleDeleteClick(event, item)} />
                  ))}
                </div>
              </div>
            ))}
            <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
              {dialogContent?.type === 'delete' && (
                <>
                  <DialogTitle>Delete App?</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      <p>
                        You are about to delete <strong>{dialogContent.item.title}</strong>.
                      </p>
                      <p className="mt-1">Are you sure you want to delete this app?</p>
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

        <div className="border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsButton onClick={() => setIsSettingsOpen(true)} />
              <div className="h-6 w-px bg-bolt-elements-borderColor" />
              <Feedback />
            </div>
            <ThemeSwitch />
          </div>
        </div>
      </div>
      <SettingsWindow open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </motion.div>
  );
};
