import React from 'react';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { database } from '~/lib/persistence/apps';
import type { Message } from '~/lib/persistence/message';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { addChatMessage, chatStore } from '~/lib/stores/chat';
import { getCurrentUserInfo } from '~/lib/supabase/client';
import { classNames } from '~/utils/classNames';
import { assert, generateRandomId, navigateApp } from '~/utils/nut';

interface ReferenceAppCardProps {
  appName: string;
  description: string;
  bulletPoints?: string[];
  photo?: string;
  appPath?: string;
  photoOnLeft?: boolean;
  sendMessage: (params: ChatMessageParams) => void;
}

export const ReferenceAppCard: React.FC<ReferenceAppCardProps> = ({
  appName,
  description,
  bulletPoints = [],
  photo,
  appPath,
  photoOnLeft = true,
  sendMessage,
}) => {
  const handleClick = async () => {
    assert(appPath, 'App path is required');

    sendMessage({
      messageInput: `Build me a new app based on '${appName}'`,
      chatMode: ChatMode.UserMessage,
      referenceAppPath: appPath,
    });
  };

  const isClickable = !!appPath;
  const displayPhoto = photo || 'https://placehold.co/800x450/1e293b/94a3b8?text=Coming+Soon';

  return (
    <div
      className={classNames('relative rounded-xl transition-all duration-300 shadow-sm group', {
        'cursor-pointer hover:shadow-xl hover:shadow-bolt-elements-focus/10 hover:scale-[1.02]':
          isClickable,
      })}
      onClick={handleClick}
    >
      <div
        className={classNames(
          'bg-bolt-elements-background-depth-2 rounded-xl transition-all duration-300 relative overflow-hidden',
          {
            'border border-bolt-elements-borderColor hover:border-bolt-elements-focus/60': isClickable,
            'border border-bolt-elements-borderColor': !isClickable,
          },
        )}
      >
        {isClickable && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-bolt-elements-focus/8 via-bolt-elements-focus/3 to-bolt-elements-focus/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
        )}

        <div
          className={classNames('flex flex-col md:flex-row md:items-stretch', {
            'md:flex-row-reverse': !photoOnLeft,
          })}
        >
          {/* Photo Section */}
          <div className="relative w-full md:w-1/2 aspect-video md:aspect-auto md:h-full min-h-[200px] overflow-hidden bg-bolt-elements-background-depth-3 flex-shrink-0">
            <img
              src={displayPhoto}
              alt={appName}
              className={classNames('w-full h-full object-cover', {
                'transition-transform duration-300 group-hover:scale-105': isClickable,
              })}
            />
            {isClickable && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
          </div>

          {/* Content Section */}
          <div className="p-5 relative flex-1 flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-bolt-elements-textHeading mb-2">{appName}</h3>

            <p className="text-sm text-bolt-elements-textSecondary leading-relaxed mb-4">
              {description}
            </p>

            {/* Bullet Points */}
            {bulletPoints.length > 0 && (
              <ul className="space-y-2">
                {bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-bolt-elements-textSecondary">
                    <span className="text-bolt-elements-focus mt-1.5 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
