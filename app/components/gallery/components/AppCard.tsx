import { useState } from 'react';
import { MoreHorizontal, PenLine, Trash2, Check } from 'lucide-react';
import type { AppLibraryEntry } from '~/lib/persistence/apps';
import { Button } from '~/components/ui/button';
import { classNames } from '~/utils/classNames';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useEditAppTitle } from '~/lib/hooks/useEditAppTitle';

// Format relative time (e.g., "3 days ago", "2 hours ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }
  if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  if (diffWeeks > 0) {
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  }
  return 'Just now';
}

interface AppCardProps {
  app: AppLibraryEntry;
  onClick?: () => void;
  onDelete?: (event: React.UIEvent) => void;
  className?: string;
}

export const AppCard = ({ app, onClick, onDelete, className }: AppCardProps) => {
  const avatarLetter = app.title?.charAt(0)?.toUpperCase() || 'A';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { editing, handleChange, handleBlur, handleSubmit, handleKeyDown, currentTitle, toggleEditMode } =
    useEditAppTitle({
      initialTitle: app.title,
      customAppId: app.id,
    });

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
    toggleEditMode();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(false);
    onDelete?.(e);
  };

  return (
    <div
      onClick={editing ? undefined : onClick}
      className={classNames(
        'w-80 p-1 rounded-md border border-border bg-card flex flex-col gap-0.5 transition-colors hover:bg-accent/50 group',
        { 'cursor-pointer': !editing },
        className,
      )}
    >
      {/* Screenshot image */}
      <div className="relative w-full aspect-[312/175.5] rounded-md overflow-hidden bg-muted">
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <span className="text-4xl font-bold text-muted-foreground/30">{avatarLetter}</span>
        </div>

        {/* Privacy icon - bottom right of image */}
        {/* <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full border border-input bg-card flex items-center justify-center">
          <Globe className="w-4 h-4 text-muted-foreground" />
        </div> */}
      </div>

      {/* Bottom section */}
      <div className="flex items-center gap-2 p-1">
        {/* Text content */}
        <div className="flex-1 flex flex-col min-w-0">
          {editing ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                className="flex-1 bg-background text-foreground rounded-md px-2 py-1 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                autoFocus
                value={currentTitle}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
              />
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent flex-shrink-0"
                onMouseDown={handleSubmit}
              >
                <Check size={16} />
              </button>
            </form>
          ) : (
            <>
              <span className="text-sm font-semibold text-foreground leading-normal line-clamp-1">{app.title}</span>
              <span className="text-xs font-normal text-muted-foreground leading-normal line-clamp-1">
                {formatRelativeTime(app.updatedAt || app.createdAt)}
              </span>
            </>
          )}
        </div>

        {/* Menu button with dropdown */}
        {!editing && (
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleEditClick}>
                <PenLine className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default AppCard;
