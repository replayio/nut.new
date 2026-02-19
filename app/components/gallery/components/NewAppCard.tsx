import { Plus } from 'lucide-react';
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
        'w-80 p-1 rounded-md border border-border bg-card flex flex-col gap-0.5 cursor-pointer transition-colors hover:bg-accent/50 group',
        className,
      )}
    >
      {/* Image placeholder - same aspect ratio as AppCard */}
      <div className="relative w-full aspect-[295/217] rounded-md overflow-hidden flex items-center justify-center">
        <button className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center transition-colors shadow-lg">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default NewAppCard;
