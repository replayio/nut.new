import { memo } from 'react';
import { ThumbsUp } from 'lucide-react';
import { classNames } from '~/utils/classNames';

interface LikeButtonProps {
  liked: boolean;
  likeCount: number;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export const LikeButton = memo(({ liked, likeCount, disabled = false, onClick, className }: LikeButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
        liked ? 'text-yellow-600 hover:text-yellow-700' : 'text-muted-foreground hover:text-yellow-500',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
      title={disabled ? 'Log in to like' : liked ? 'Liked' : 'Like'}
    >
      <ThumbsUp
        size={16}
        style={
          liked
            ? {
                fill: 'rgb(250 204 21)',
                stroke: 'rgb(202 138 4)',
                strokeWidth: 1.5,
                paintOrder: 'fill stroke',
              }
            : {}
        }
      />
      <span className="text-xs font-medium">{likeCount || 0}</span>
    </button>
  );
});

LikeButton.displayName = 'LikeButton';
