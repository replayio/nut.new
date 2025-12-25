import React from 'react';
import type { LandingPageIndexEntry } from '~/lib/replay/ReferenceApps';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import { assert } from '~/utils/nut';

interface ReferenceAppLandingPageProps {
  app: LandingPageIndexEntry;
  sendMessage: (params: ChatMessageParams) => void;
  onClose: () => void;
}

export const ReferenceAppLandingPage: React.FC<ReferenceAppLandingPageProps> = ({
  app,
  sendMessage,
  onClose,
}) => {
  const handleCustomize = async () => {
    assert(app.referenceAppPath, 'App path is required');

    sendMessage({
      messageInput: `Build me a new app based on '${app.name}'`,
      chatMode: ChatMode.UserMessage,
      referenceAppPath: app.referenceAppPath,
    });
  };

  const displayPhoto = app.screenshotURL || 'https://placehold.co/800x450/1e293b/94a3b8?text=Coming+Soon';

  return (
    <div className="max-w-[1337px] mx-auto mt-8 mb-8 animate-fade-in">
      <div className="bg-bolt-elements-background border border-bolt-elements-borderColor rounded-lg overflow-hidden shadow-lg">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-6 border-b border-bolt-elements-borderColor">
          <h2 className="text-3xl font-bold text-bolt-elements-textHeading">{app.name}</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-bolt-elements-textSecondary hover:text-bolt-elements-textHeading hover:bg-bolt-elements-backgroundHover rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Screenshot */}
          <div className="mb-6 rounded-lg overflow-hidden">
            <img
              src={displayPhoto}
              alt={app.name}
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-lg text-bolt-elements-textSecondary leading-relaxed">
              {app.shortDescription}
            </p>
          </div>

          {/* Bullet Points */}
          {app.bulletPoints && app.bulletPoints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-bolt-elements-textHeading mb-4">Features</h3>
              <ul className="space-y-2">
                {app.bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-rose-500 mt-1">•</span>
                    <span className="text-bolt-elements-textSecondary">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {app.tags && app.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-bolt-elements-textHeading mb-4">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {app.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 text-sm font-medium bg-purple-100/50 dark:bg-purple-500/10 text-bolt-elements-textHeading rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stage Badge */}
          <div className="mb-6">
            <span
              className={`inline-block px-4 py-2 text-sm font-medium rounded-full ${
                app.stage === 'Release'
                  ? 'bg-green-100/50 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                  : app.stage === 'Beta'
                    ? 'bg-blue-100/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                    : 'bg-yellow-100/50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
              }`}
            >
              {app.stage}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-bolt-elements-borderColor">
            <button
              onClick={handleCustomize}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
            >
              Build me a new app based on this
            </button>
            {app.landingPageURL && (
              <a
                href={app.landingPageURL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-bolt-elements-backgroundHover hover:bg-bolt-elements-backgroundHover/80 text-bolt-elements-textHeading font-medium rounded-lg border border-bolt-elements-borderColor transition-colors"
              >
                View Live Demo
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

