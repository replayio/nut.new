import { useEffect, useRef, useState } from 'react';
import { SettingsWindow } from '~/components/settings/SettingsWindow';
import { useStore } from '@nanostores/react';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import { messageInputFocusStore } from '~/lib/stores/messageInputFocus';
import useViewport from '~/lib/hooks';
import { Plus, PanelLeft, Home, File, Layers, Sparkles } from '~/components/ui/Icon';
import { classNames } from '~/utils/classNames';
import { ClientAuth } from '~/components/auth/ClientAuth';
import WithTooltip from '~/components/ui/Tooltip';
import { TooltipProvider } from '@radix-ui/react-tooltip';

export const Menu = () => {
  const menuRef = useRef<HTMLDivElement>(null);
  const isOpen = useStore(sidebarMenuStore.isOpen);
  const isCollapsed = useStore(sidebarMenuStore.isCollapsed);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isSmallViewport = useViewport(1024);

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
      sidebarMenuStore.setCollapsed(false);
    }
  };

  return (
    <div
      ref={menuRef}
      onClick={handleSidebarClick}
      className={classNames(
        'flex selection-accent flex-col side-menu fixed top-0 w-full h-full bg-muted border-r border-border/50 z-sidebar shadow-2xl hover:shadow-3xl text-sm backdrop-blur-sm transition-all duration-300 ease-out',
        effectiveCollapsed ? 'lg:w-[60px] cursor-pointer' : 'lg:w-[260px]',
      )}
    >
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* Header */}
        <div
          className={classNames(
            'py-4 border-b border-border/50 transition-all duration-300',
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
                        sidebarMenuStore.setCollapsed(!isCollapsed);
                        sidebarMenuStore.open();
                      }
                    }}
                    className="w-full flex items-center justify-center rounded-md hover:bg-card transition-all opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto absolute inset-0"
                    aria-label={isSmallViewport ? 'Close sidebar' : 'Expand sidebar'}
                  >
                    <PanelLeft size={18} className="text-foreground" />
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
                    <h1 className="text-foreground font-bold text-xl whitespace-nowrap overflow-hidden transition-all duration-300">
                      Replay
                    </h1>
                  </div>
                  {/* PanelLeft button - always visible when expanded */}
                  <button
                    onClick={() => {
                      if (isSmallViewport) {
                        sidebarMenuStore.close();
                      } else {
                        sidebarMenuStore.setCollapsed(!isCollapsed);
                        sidebarMenuStore.close();
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-card transition-colors"
                    aria-label={isSmallViewport ? 'Close sidebar' : 'Collapse sidebar'}
                  >
                    <PanelLeft size={20} className="text-foreground" />
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
                    'w-full flex items-center rounded-md text-foreground transition-colors',
                    effectiveCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                    window.location.pathname === '/' || window.location.pathname === '' ? 'bg-card' : 'hover:bg-card',
                  )}
                  title={effectiveCollapsed ? 'Home' : undefined}
                >
                  <Home size={18} className="text-foreground shrink-0" />
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
                      'w-full flex items-center rounded-md text-foreground transition-colors',
                      effectiveCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2',
                      window.location.pathname === '/' || window.location.pathname === '' ? 'bg-card' : 'hover:bg-card',
                    )}
                    title={effectiveCollapsed ? 'Home' : undefined}
                  >
                    <Home size={18} className="text-foreground" />
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
                      sidebarMenuStore.setCollapsed(true);
                      sidebarMenuStore.close();
                    }
                    // Trigger focus on message input
                    messageInputFocusStore.triggerFocus();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-foreground hover:bg-card transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Plus size={18} className="text-foreground shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300">
                      New App
                    </span>
                  </div>
                  {!isSmallViewport && <span className="text-xs text-muted-foreground">Ctrl+Shift+N</span>}
                </div>
              ) : (
                <WithTooltip tooltip="New App">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSmallViewport) {
                        sidebarMenuStore.close();
                      } else {
                        sidebarMenuStore.setCollapsed(true);
                        sidebarMenuStore.close();
                      }
                      // Trigger focus on message input
                      messageInputFocusStore.triggerFocus();
                    }}
                    className="w-full flex items-center justify-center px-2 py-2 rounded-md text-foreground hover:bg-card transition-colors cursor-pointer"
                    title="New App"
                  >
                    <Plus size={18} className="text-foreground" />
                  </div>
                </WithTooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        {/* Projects Section */}
        <div
          className={classNames(
            'py-4 border-b border-border/50 transition-all duration-300',
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
                    sidebarMenuStore.setCollapsed(false);
                  }
                : undefined
            }
          >
            {!effectiveCollapsed && (
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</span>
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
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-colors',
                    window.location.pathname === '/projects' ? 'bg-card' : 'hover:bg-card',
                  )}
                >
                  <File size={18} className="text-foreground shrink-0" />
                  <span className="text-sm font-medium">My Projects</span>
                </a>
              ) : (
                <WithTooltip tooltip="My Projects">
                  <a
                    href="/projects"
                    onClick={(e) => e.stopPropagation()}
                    className={classNames(
                      'w-full flex items-center justify-center px-2 py-2 rounded-md text-foreground transition-colors',
                      window.location.pathname === '/projects' ? 'bg-card' : 'hover:bg-card',
                    )}
                  >
                    <File size={18} className="text-foreground" />
                  </a>
                </WithTooltip>
              )}

              {/* Reference Applications */}
              {!effectiveCollapsed ? (
                <a
                  href="/gallery"
                  className={classNames(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-colors',
                    window.location.pathname === '/gallery' ? 'bg-card' : 'hover:bg-card',
                  )}
                >
                  <Sparkles size={18} className="text-foreground shrink-0" />
                  <span className="text-sm font-medium">Reference applications</span>
                </a>
              ) : (
                <WithTooltip tooltip="Reference applications">
                  <a
                    href="/gallery"
                    onClick={(e) => e.stopPropagation()}
                    className={classNames(
                      'w-full flex items-center justify-center px-2 py-2 rounded-md text-foreground transition-colors',
                      window.location.pathname === '/gallery' ? 'bg-card' : 'hover:bg-card',
                    )}
                  >
                    <Sparkles size={18} className="text-foreground" />
                  </a>
                </WithTooltip>
              )}

              {/* Collections */}
              {!effectiveCollapsed ? (
                <a
                  href="/collection"
                  className={classNames(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-foreground transition-colors',
                    window.location.pathname === '/gallery' ? 'bg-card' : 'hover:bg-card',
                  )}
                >
                  <Layers size={18} className="text-foreground shrink-0" />
                  <span className="text-sm font-medium">Collections</span>
                </a>
              ) : (
                <WithTooltip tooltip="Collections">
                  <a
                    href="/collection"
                    onClick={(e) => e.stopPropagation()}
                    className={classNames(
                      'w-full flex items-center justify-center px-2 py-2 rounded-md text-foreground transition-colors',
                      window.location.pathname === '/gallery' ? 'bg-card' : 'hover:bg-card',
                    )}
                  >
                    <Layers size={18} className="text-foreground" />
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
