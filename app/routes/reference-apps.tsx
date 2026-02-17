import { json, type MetaFunction } from '~/lib/remix-types';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { ReferenceGallery } from '~/components/gallery/ReferenceGallery';
import { useStore } from '@nanostores/react';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import useViewport from '~/lib/hooks/useViewport';
import { classNames } from '~/utils/classNames';
import { MobileNav } from '~/components/mobile-nav/MobileNav.client';
import { useEffect } from 'react';
import { useUser } from '~/hooks/useUser';
import { checkSubscriptionStatus } from '~/lib/stripe/client';
import { subscriptionStore } from '~/lib/stores/subscriptionStatus';

export const meta: MetaFunction = () => {
  return [{ title: 'Reference Apps - Replay Builder' }];
};

export const loader = () => json({});

export default function ReferenceAppsPage() {
  const user = useUser();
  const isSmallViewport = useViewport(1024);
  const isSidebarCollapsed = useStore(sidebarMenuStore.isCollapsed);

  // Open sidebar menu by default on desktop
  useEffect(() => {
    if (!isSmallViewport) {
      sidebarMenuStore.open();
    }
  }, [isSmallViewport]);

  // Load subscription status
  useEffect(() => {
    const fetchAccess = async () => {
      if (user) {
        const stripeStatus = await checkSubscriptionStatus();
        subscriptionStore.setSubscription(stripeStatus);
      } else {
        subscriptionStore.setSubscription({ hasSubscription: false, subscription: null });
      }
    };

    fetchAccess();
  }, [user]);

  return (
    <div className="flex h-screen w-full bg-muted overflow-hidden">
      {/* Sidebar */}
      <ClientOnly>{() => <Menu />}</ClientOnly>

      {/* Main content */}
      <main
        className={classNames('flex-1 overflow-auto transition-all duration-300', {
          'lg:ml-[60px]': !isSmallViewport && isSidebarCollapsed,
          'lg:ml-[260px]': !isSmallViewport && !isSidebarCollapsed,
        })}
      >
        <div className="p-6 lg:p-8">
          <ReferenceGallery />
        </div>
      </main>

      {/* Mobile nav */}
      {isSmallViewport && <ClientOnly>{() => <MobileNav />}</ClientOnly>}
    </div>
  );
}
