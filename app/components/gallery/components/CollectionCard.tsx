import type { CollectionPageIndexEntry } from '~/lib/replay/ReferenceApps';
import { classNames } from '~/utils/classNames';
import { ChevronRight } from 'lucide-react';

interface CollectionCardProps {
  collection: CollectionPageIndexEntry;
  className?: string;
}

export const CollectionCard = ({ collection, className }: CollectionCardProps) => {
  const handleViewCollection = () => {
    const encodedName = encodeURIComponent(collection.name);
    window.location.href = `/collection/${encodedName}`;
  };

  return (
    <button
      onClick={handleViewCollection}
      className={classNames(
        'group text-left bg-card rounded-md p-4 border border-border hover:bg-accent/50 transition-colors cursor-pointer',
        className,
      )}
    >
      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-foreground transition-colors">
        {collection.name}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {collection.shortDescription}
      </p>
      <div className="mt-4 flex items-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm font-medium">View collection</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </button>
  );
};

export default CollectionCard;
