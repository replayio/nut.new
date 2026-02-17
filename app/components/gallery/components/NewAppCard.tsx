import { Plus, ArrowRight } from 'lucide-react';
import { classNames } from '~/utils/classNames';

interface NewAppCardProps {
  onClick?: () => void;
  className?: string;
}

export const NewAppCard = ({ onClick, className }: NewAppCardProps) => {
  return (
    <div
      onClick={onClick}
      className={classNames(
        'p-1 rounded-md border border-border bg-card flex flex-col gap-0.5 cursor-pointer transition-colors hover:bg-accent/50 group',
        className,
      )}
    >
      {/* Placeholder with plus button */}
      <div className="relative w-full aspect-[312/175.5] rounded-md overflow-hidden bg-muted flex items-center justify-center">
        <button className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center transition-colors shadow-lg">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Bottom section */}
      <div className="flex items-center justify-between gap-2 p-1">
        {/* Text content */}
        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground leading-normal">New app</span>
          <span className="text-xs font-normal text-muted-foreground leading-normal">Create a new application</span>
        </div>

        {/* Arrow */}
        <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
};

export default NewAppCard;
