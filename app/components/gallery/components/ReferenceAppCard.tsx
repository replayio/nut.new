import { Globe, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { ReferenceAppSummary } from '~/lib/replay/ReferenceApps';
import { Button } from '~/components/ui/button';
import { classNames } from '~/utils/classNames';

interface ReferenceAppCardProps {
  app: ReferenceAppSummary;
  className?: string;
}

export const ReferenceAppCard = ({ app, className }: ReferenceAppCardProps) => {
  const [imageError, setImageError] = useState(false);

  const handleViewDetails = () => {
    const encodedName = encodeURIComponent(app.name);
    window.location.href = `/gallery/${encodedName}`;
  };

  return (
    <div
      className={classNames(
        'w-80 p-1 rounded-md border border-border bg-card flex flex-col gap-0.5 cursor-pointer transition-colors hover:bg-accent/50 group',
        className,
      )}
    >
      {/* Screenshot image */}
      <div className="relative w-full aspect-[312/175.5] rounded-md overflow-hidden bg-muted">
        {app.screenshotURL && !imageError ? (
          <img
            src={app.screenshotURL}
            alt={app.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-muted-foreground text-sm">No preview</span>
          </div>
        )}

        {/* Privacy icon - top right of image */}
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full border border-input bg-card flex items-center justify-center">
          <Globe className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex items-center gap-2 p-1">
        {/* Avatar */}
        <div className="w-5 h-5 rounded-full bg-muted shrink-0 overflow-hidden">
          {app.screenshotURL && !imageError ? (
            <img src={app.screenshotURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground leading-normal line-clamp-1">{app.name}</span>
          <span className="text-xs font-normal text-muted-foreground leading-normal line-clamp-2">
            {app.shortDescription}
          </span>
        </div>

        {/* View button */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 rounded-full px-4"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
        >
          View
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ReferenceAppCard;
