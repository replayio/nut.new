
/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { classNames } from '~/utils/classNames';
import { navigateApp } from '~/utils/nut';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useState } from 'react';
import { database } from '~/lib/persistence/apps';
import { useLoaderData } from '@remix-run/react';
import { toast } from 'react-toastify';

export const TEXTAREA_MIN_HEIGHT = 76;

export const Unauthorized = () => {
  const { id: appId } = useLoaderData<{ id?: string }>() ?? {};
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyApp = async () => {
    if (!appId || isCopying) return;

    setIsCopying(true);
    try {
      const newAppId = await database.copyApp(appId);
      toast.success('App copied successfully!');
      navigateApp(newAppId);
    } catch (error) {
      console.error('Failed to copy app:', error);
      toast.error('Failed to copy app. Please try again.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div
        className={classNames('relative flex h-full w-full overflow-hidden')}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="i-ph:lock-key-bold text-4xl text-bolt-elements-textSecondary mb-4"></div>
              <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">
                App Access Restricted
              </h2>
              <p className="text-bolt-elements-textSecondary">
                This app is owned by another user. You can create a copy to work with it.
              </p>
            </div>
            
            <button
              onClick={handleCopyApp}
              disabled={isCopying}
              className={classNames(
                'inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                {
                  'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text hover:bg-bolt-elements-button-primary-backgroundHover':
                    !isCopying,
                  'bg-bolt-elements-button-secondary-background text-bolt-elements-button-secondary-text opacity-50 cursor-not-allowed':
                    isCopying,
                }
              )}
            >
              {isCopying ? (
                <>
                  <div className="i-ph:spinner animate-spin mr-2"></div>
                  Creating Copy...
                </>
              ) : (
                <>
                  <div className="i-ph:copy-bold mr-2"></div>
                  Create a Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
};
