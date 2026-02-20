import { ChevronLeft, ChevronRight, ArrowDownWideNarrow } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface MessageNavigatorProps {
  userMessages: Array<{ id: string; content: string; index: number }>;
  currentIndex: number;
  onNavigate: (index: number) => void;
  onScrollToBottom: () => void;
  showJumpToBottom: boolean;
}

export function MessageNavigator({
  userMessages,
  currentIndex,
  onNavigate,
  onScrollToBottom,
  showJumpToBottom,
}: MessageNavigatorProps) {
  if (userMessages.length === 0) {
    return null;
  }

  const currentMessage = userMessages[currentIndex];
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < userMessages.length - 1;

  const handlePrevious = () => {
    if (canGoBack) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      onNavigate(currentIndex + 1);
    }
  };

  return (
    <div className="flex items-center gap-1 p-4 bg-background border border-border rounded-md shadow-md relative z-20">
      {/* Message text */}
      <div className="flex-1 min-w-0 text-sm text-foreground truncate pr-2">
        {currentMessage.content}
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          disabled={!canGoBack}
          className={cn(
            'h-7 w-7 text-muted-foreground',
            canGoBack && 'hover:text-foreground hover:bg-muted',
          )}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={!canGoForward}
          className={cn(
            'h-7 w-7 text-muted-foreground',
            canGoForward && 'hover:text-foreground hover:bg-muted',
          )}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-border mx-1" />

      {/* Scroll to bottom */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onScrollToBottom}
        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
        disabled={!showJumpToBottom}
      >
        <ArrowDownWideNarrow size={16} />
      </Button>
    </div>
  );
}
