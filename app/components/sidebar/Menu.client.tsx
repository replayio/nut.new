import { useEffect, useRef, useState } from 'react';
import { SettingsWindow } from '~/components/settings/SettingsWindow';
import { useStore } from '@nanostores/react';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import { messageInputFocusStore } from '~/lib/stores/messageInputFocus';
import useViewport from '~/lib/hooks';
import { Plus, PanelLeft, Home, File, Sparkles } from '~/components/ui/Icon';
import { classNames } from '~/utils/classNames';
import { ClientAuth } from '~/components/auth/ClientAuth';
import WithTooltip from '~/components/ui/Tooltip';
import { TooltipProvider } from '@radix-ui/react-tooltip';

export const Menu = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = useStore(sidebarMenuStore.isOpen);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isSmallViewport = useViewport(1024);
  const [isCollapsed, setIsCollapsed] = useState(sidebarMenuStore.isCollapsed.get());

  // Sync local state with store
  useEffect(() => {
    const unsubscribe = sidebarMenuStore.isCollapsed.subscribe((collapsed) => {
      setIsCollapsed(collapsed);
    });
    return unsubscribe;
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+K or Cmd+Shift+K for search
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'K') {
        event.preventDefault();
      }
      // Ctrl+Shift+N for new app (Shift modifier bypasses browser's Ctrl+N)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        if (isSmallViewport) {
          sidebarMenuStore.close();
        } else {
          sidebarMenuStore.setCollapsed(true);
          sidebarMenuStore.close();
        }
        // Trigger focus on message input
        messageInputFocusStore.triggerFocus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSmallViewport]);

  // On mobile, only show menu when isOpen is true, and always show expanded (not collapsed)
  const shouldShowMenu = !isSmallViewport || isOpen;
  const effectiveCollapsed = isSmallViewport ? false : isCollapsed;

  if (!shouldShowMenu) {
    return null;
  }

  // Handle click on collapsed sidebar to expand it
  const handleSidebarClick = () => {
    // Only expand if collapsed and not on small viewport
    if (effectiveCollapsed && !isSmallViewport) {
      setIsCollapsed(false);
      sidebarMenuStore.setCollapsed(false);
    }
  };

  return (
    <div
      ref={menuRef}
      onClick={handleSidebarClick}
      className={classNames(
        'flex selection-accent flex-col side-menu fixed top-0 w-full h-full bg-bolt-elements-background-depth-2 border-r border-bolt-elements-borderColor border-opacity-50 z-sidebar shadow-2xl hover:shadow-3xl text-sm backdrop-blur-sm transition-all duration-300 ease-out',
        effectiveCollapsed ? 'lg:w-[60px] cursor-pointer' : 'lg:w-[260px]',
      )}
    >
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* Header */}
        <div
          className={classNames(
            'py-4 border-b border-bolt-elements-borderColor border-opacity-50 transition-all duration-300',
            effectiveCollapsed ? 'px-2' : 'px-6',
          )}
        >
          <div
            className={classNames(
              'flex items-center mb-6 w-full',
              effectiveCollapsed ? 'justify-center' : 'justify-between',
            )}
          >
            <div
              className={classNames(
                'flex items-center w-full',
                effectiveCollapsed ? 'group relative justify-center' : 'gap-3',
              )}
            >
              {effectiveCollapsed ? (
                <div className="relative w-full flex items-center justify-center">
                  {/* Logo - shows by default when collapsed, hidden on hover */}
                  <div className="w-full flex items-center justify-center group-hover:opacity-0 group-hover:pointer-events-none transition-opacity">
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
                    </div>
                  </div>
                  {/* PanelLeft button - hidden by default when collapsed, shows on hover in same position */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSmallViewport) {
                        sidebarMenuStore.close();
                      } else {
                        const newCollapsed = !isCollapsed;
                        setIsCollapsed(newCollapsed);
                        sidebarMenuStore.setCollapsed(newCollapsed);
                        sidebarMenuStore.open();
                      }
                    }}
                    className="w-full flex items-center justify-center rounded-md hover:bg-bolt-elements-background-depth-1 transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto absolute inset-0"
                    aria-label={isSmallViewport ? 'Close sidebar' : 'Expand sidebar'}
                  >
                    <PanelLeft size={18} className="text-bolt-elements-textPrimary" />
                  </button>
                </div>
              ) : (
                <div className="w-full flex justify-between items-center">
                  {/* Logo - always visible when expanded */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <div className="relative w-6 h-6">
                        <img src="/logo.svg" alt="Logo" className="w-6 h-6" />
                      </div>
                    </div>
                    <h1 className="text-bolt-elements-textHeading font-bold text-xl whitespace-nowrap overflow-hidden transition-all duration-300">
                      Replay
                    </h1>
                  </div>
                  {/* PanelLeft button - always visible when expanded */}
                  <button
                    onClick={() => {
                      if (isSmallViewport) {
                        sidebarMenuStore.close();
                      } else {
                        const newCollapsed = !isCollapsed;
                        setIsCollapsed(newCollapsed);
                        sidebarMenuStore.setCollapsed(newCollapsed);
                        sidebarMenuStore.close();
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-bolt-elements-background-depth-1 transition-colors"
                    aria-label={isSmallViewport ? 'Close sidebar' : 'Collapse sidebar'}
                  >
                    <PanelLeft size={20} className="text-bolt-elements-textPrimary" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            {/* Home */}
            <TooltipProvider>
              {!effectiveCollapsed ? (
                <a
                  href="/"
                  className={classNames(
                    'w-full flex items-center rounded-md text-bolt-elements-textPrimary transition-colors',
                    effectiveCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                    window.location.pathname === '/' || window.location.pathname === ''
                      ? 'bg-bolt-elements-background-depth-1'
                      : 'hover:bg-bolt-elements-background-depth-1',
                  )}
                  title={effectiveCollapsed ? 'Home' : undefined}
                >
                  <Home size={18} className="text-bolt-elements-textPrimary shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                    Home
                  </span>
                </a>
              ) : (
                <WithTooltip tooltip="Home">
                  <a
                    href="/"
                    onClick={(e) => e.stopPropagation()}
                    className={classNames(
                      'w-full flex items-center rounded-md text-bolt-elements-textPrimary transition-colors',
                      effectiveCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                      window.location.pathname === '/' || window.location.pathname === ''
                        ? 'bg-bolt-elements-background-depth-1'
                        : 'hover:bg-bolt-elements-background-depth-1',
                    )}
                    title={effectiveCollapsed ? 'Home' : undefined}
                  >
                    <Home size={18} className="text-bolt-elements-textPrimary" />
                  </a>
                </WithTooltip>
              )}

              {/* New App */}
              {!effectiveCollapsed ? (
                <div
                  onClick={() => {
                    if (isSmallViewport) {
                      sidebarMenuStore.close();
                    } else {
                      setIsCollapsed(true);
                      sidebarMenuStore.setCollapsed(true);
                      sidebarMenuStore.close();
                    }
                    // Trigger focus on message input
                    messageInputFocusStore.triggerFocus();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Plus size={18} className="text-bolt-elements-textPrimary shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                      New App
                    </span>
                  </div>
                  {!isSmallViewport && <span className="text-xs text-bolt-elements-textSecondary">Ctrl+Shift+N</span>}
                </div>
              ) : (
                <WithTooltip tooltip="New App">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSmallViewport) {
                        sidebarMenuStore.close();
                      } else {
                        setIsCollapsed(true);
                        sidebarMenuStore.setCollapsed(true);
                        sidebarMenuStore.close();
                      }
                      // Trigger focus on message input
                      messageInputFocusStore.triggerFocus();
                    }}
                    className="w-full flex items-center justify-center px-2 py-2 rounded-md text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-1 transition-colors cursor-pointer"
                    title="New App"
                  >
                    <Plus size={18} className="text-bolt-elements-textPrimary" />
                  </div>
                </WithTooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* Projects Section */}
        <div
          className={classNames(
            'py-4 border-b border-bolt-elements-borderColor border-opacity-50 transition-all duration-300',
            effectiveCollapsed ? 'px-2' : 'px-6',
          )}
        >
          {/* Section Header */}
          <div
            className={classNames(
              'flex items-center mb-3 transition-all duration-300',
              effectiveCollapsed ? 'justify-center cursor-pointer' : 'gap-3',
            )}
            onClick={
              effectiveCollapsed
                ? (e) => {
                    e.stopPropagation();
                    setIsCollapsed(false);
                    sidebarMenuStore.setCollapsed(false);
                  }
                : undefined
            }
          >
            {!effectiveCollapsed && (
              <span className="text-xs font-semibold text-bolt-elements-textSecondary uppercase tracking-wider">
                Projects
              </span>
            )}
          </div>

          {/* Project Navigation Links */}
          <div className="space-y-1">
            <TooltipProvider>
              {/* My Projects */}
              {!effectiveCollapsed ? (
                <a
                  href="/projects"
                  className={classNames(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-bolt-elements-textPrimary transition-colors',
                    window.location.pathname === '/projects'
                      ? 'bg-bolt-elements-background-depth-1'
                      : 'hover:bg-bolt-elements-background-depth-1',
                  )}
                >
                  <File size={18} className="text-bolt-elements-textPrimary shrink-0" />
                  <span className="text-sm font-medium">My Projects</span>
                </a>
              ) : (
                <WithTooltip tooltip="My Projects">
                  <a
                    href="/projects"
                    onClick={(e) => e.stopPropagation()}
                    className={classNames(
                      'w-full flex items-center justify-center px-2 py-2 rounded-md text-bolt-elements-textPrimary transition-colors',
                      window.location.pathname === '/projects'
                        ? 'bg-bolt-elements-background-depth-1'
                        : 'hover:bg-bolt-elements-background-depth-1',
                    )}
                  >
                    <File size={18} className="text-bolt-elements-textPrimary" />
                  </a>
                </WithTooltip>
              )}

              {/* Reference Applications */}
              {!effectiveCollapsed ? (
                <a
                  href="/reference-apps"
                  className={classNames(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-bolt-elements-textPrimary transition-colors',
                    window.location.pathname === '/reference-apps'
                      ? 'bg-bolt-elements-background-depth-1'
                      : 'hover:bg-bolt-elements-background-depth-1',
                  )}
                >
                  <Sparkles size={18} className="text-bolt-elements-textPrimary shrink-0" />
                  <span className="text-sm font-medium">Reference applications</span>
                </a>
              ) : (
                <WithTooltip tooltip="Reference applications">
                  <a
                    href="/reference-apps"
                    onClick={(e) => e.stopPropagation()}
                    className={classNames(
                      'w-full flex items-center justify-center px-2 py-2 rounded-md text-bolt-elements-textPrimary transition-colors',
                      window.location.pathname === '/reference-apps'
                        ? 'bg-bolt-elements-background-depth-1'
                        : 'hover:bg-bolt-elements-background-depth-1',
                    )}
                  >
                    <Sparkles size={18} className="text-bolt-elements-textPrimary" />
                  </a>
                </WithTooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        <div className={classNames('py-4 mt-auto px-2 relative overflow-visible')} onClick={(e) => e.stopPropagation()}>
          <ClientAuth isSidebarCollapsed={isCollapsed} />
        </div>
      </div>
      <SettingsWindow open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
