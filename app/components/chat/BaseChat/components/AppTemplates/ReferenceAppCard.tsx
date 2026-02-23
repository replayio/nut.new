import React from 'react';
import { Expand } from 'lucide-react';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { REFERENCE_APP_PLACEHOLDER_PHOTO, type ReferenceAppStage } from '~/lib/replay/ReferenceApps';
import { classNames } from '~/utils/classNames';
import { assert } from '~/utils/nut';
import { ReferenceAppStatusIndicator } from './ReferenceAppStatusIndicator';
import { Button } from '~/components/ui/button';

interface ReferenceAppCardProps {
  appName: string;
  description: string;
  bulletPoints?: string[];
  stage: ReferenceAppStage;
  photo?: string;
  appPath?: string;
  photoOnLeft?: boolean;
  sendMessage: (params: ChatMessageParams) => void;
  className?: string;
}

export const ReferenceAppCard: React.FC<ReferenceAppCardProps> = ({
  appName,
  description,
  // bulletPoints = [],
  photo,
  className,
  appPath,
  sendMessage,
  stage,
}) => {
  const displayPhoto = photo || REFERENCE_APP_PLACEHOLDER_PHOTO;

  const handleCustomize = async () => {
    assert(appPath, 'App path is required');

    sendMessage({
      messageInput: `Build me a new app based on '${appName}'`,
      chatMode: ChatMode.UserMessage,
      referenceAppPath: appPath,
    });
  };

  const handleViewDetails = () => {
    const encodedName = encodeURIComponent(appName);
    window.location.href = `/gallery/${encodedName}`;
  };

  return (
    <div
      className={classNames(
        // Full-width, responsive card that keeps a 16:9 aspect ratio.
        // The height is driven by aspect-video so it scales with viewport on mobile.
        'group relative overflow-hidden rounded-md flex flex-col justify-end items-start gap-4 p-3 sm:p-4 border w-full aspect-video border-border transition-all duration-300',
        className,
      )}
    >
      {/* App Screenshot - Sharp, blurred on hover */}
      <img
        src={displayPhoto}
        alt={appName}
        className="absolute inset-0 w-full h-full object-cover object-top group-hover:blur-[2px] transition-all duration-300"
      />

      {/* Blurred image overlay - only at bottom (default state) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
        <img
          src={displayPhoto}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top blur-[2px]"
          style={{
            maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 60%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 60%)',
          }}
        />
      </div>

      {/* Background gradient overlays - default state */}
      <div
        className="absolute inset-0 pointer-events-none group-hover:opacity-0 transition-opacity duration-300"
        style={{
          background:
            'linear-gradient(156deg, rgba(255, 255, 255, 0.00) 44.15%, #FFF 95.01%), linear-gradient(236deg, rgba(255, 255, 255, 0.00) 26.51%, rgba(255, 255, 255, 0.60) 84.05%)',
        }}
      />

      {/* Hover state: Gradient overlay with white and muted gray gradients */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            'linear-gradient(156deg, rgba(255, 255, 255, 0.00) 44.15%, #FFF 95.01%), linear-gradient(236deg, rgba(0, 0, 0, 0.00) 26.51%, rgba(100, 116, 139, 0.50) 84.05%)',
        }}
      />

      {/* Content Section - Positioned at bottom via flexbox, hidden on hover */}
      <div className="flex flex-col relative w-full gap-2 sm:gap-4 group-hover:opacity-0 transition-opacity duration-300">
        {/* Title */}
        <div className="flex flex-col gap-1 sm:gap-2">
          <h3
            className="text-base sm:text-lg font-bold leading-none text-foreground"
            style={{
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.10)',
            }}
          >
            {appName}
          </h3>

          {/* Description */}
          <p
            className="text-[11px] sm:text-xs font-normal leading-4 text-muted-foreground truncate"
            style={{
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.10)',
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Hover state: Buttons - centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        {/* Customize it button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleCustomize();
          }}
          className="pointer-events-auto rounded-full px-4 sm:px-6 w-[140px]"
        >
          Customize it
        </Button>
        {/* View details button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
          variant="outline"
          className="pointer-events-auto rounded-full px-4 sm:px-6 w-[140px] gap-1.5 sm:gap-2"
        >
          View details
          <Expand size={14} className="sm:w-4 sm:h-4" strokeWidth={2} />
        </Button>

        {/* Stage display */}
        <div className="pointer-events-auto">
          <ReferenceAppStatusIndicator stage={stage} size="sm" />
        </div>

        {/* Feature Tags */}
        {/* {bulletPoints.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {bulletPoints.map((badge, index) => (
              <span key={index} className="px-3 py-1.5 text-sm font-medium bg-white text-foreground rounded-full">
                {badge}
              </span>
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
};
