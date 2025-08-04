
/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { classNames } from '~/utils/classNames';
import { navigateApp } from '~/utils/nut';
import * as Tooltip from '@radix-ui/react-tooltip';

export const TEXTAREA_MIN_HEIGHT = 76;

export const Unauthorized = () => {
  return (
    <Tooltip.Provider delayDuration={200}>
      <div
        className={classNames('relative flex h-full w-full overflow-hidden')}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div>
          Unauthorized
        </div>
      </div>
    </Tooltip.Provider>
  );
};
