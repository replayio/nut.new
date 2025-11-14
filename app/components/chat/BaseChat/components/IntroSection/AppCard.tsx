import React from 'react';
import { classNames } from '~/utils/classNames';
import { ChevronRight } from '~/components/ui/Icon';

interface AppCardProps {
  appName: string;
  description: string;
  bulletPoints?: string[];
  photo?: string;
  onClick?: () => void;
}

export const AppCard: React.FC<AppCardProps> = ({
  appName,
  description,
  bulletPoints = [],
  photo,
  onClick,
}) => {
  return (
    <div
      className={classNames('relative rounded-xl transition-all duration-300 shadow-sm group', {
        'cursor-pointer hover:shadow-xl hover:shadow-bolt-elements-focus/10 hover:scale-[1.03] hover:-translate-y-2':
          !!onClick,
      })}
      onClick={onClick}
    >
      <div
        className={classNames(
          'bg-bolt-elements-background-depth-2 rounded-xl transition-all duration-300 relative overflow-hidden',
          {
            'border border-bolt-elements-borderColor hover:border-bolt-elements-focus/60': !!onClick,
            'border border-bolt-elements-borderColor': !onClick,
          },
        )}
      >
        {onClick && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-bolt-elements-focus/8 via-bolt-elements-focus/3 to-bolt-elements-focus/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}

        {/* Photo Section */}
        {photo && (
          <div className="relative w-full aspect-video overflow-hidden bg-bolt-elements-background-depth-3">
            <img
              src={photo}
              alt={appName}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}

        {/* Content Section */}
        <div className="p-5 relative">
          <h3 className="text-lg font-semibold text-bolt-elements-textHeading mb-2">{appName}</h3>

          <p className="text-sm text-bolt-elements-textSecondary leading-relaxed mb-4">
            {description}
          </p>

          {/* Bullet Points */}
          {bulletPoints.length > 0 && (
            <ul className="space-y-2 mb-4">
              {bulletPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-bolt-elements-textSecondary">
                  <span className="text-bolt-elements-focus mt-1.5 flex-shrink-0">•</span>
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Click Indicator */}
          {onClick && (
            <div className="mt-4 pt-4 border-t border-bolt-elements-borderColor border-opacity-30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-bolt-elements-textSecondary">View details</span>
                <ChevronRight
                  className="text-bolt-elements-textSecondary group-hover:text-bolt-elements-textPrimary transition-colors duration-200"
                  size={12}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
