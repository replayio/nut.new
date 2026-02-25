import { json, type MetaFunction } from '~/lib/remix-types';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { AppGallery } from '~/components/gallery/AppGallery';
import { useStore } from '@nanostores/react';
import { sidebarMenuStore } from '~/lib/stores/sidebarMenu';
import useViewport from '~/lib/hooks/useViewport';
import { classNames } from '~/utils/classNames';
import { useEffect } from 'react';
import { useUser } from '~/hooks/useUser';
import { checkSubscriptionStatus } from '~/lib/stripe/client';
import { subscriptionStore } from '~/lib/stores/subscriptionStatus';
import { Header } from '~/components/header/Header';

export const meta: MetaFunction = () => {
  return [{ title: 'My Projects - Replay Builder' }];
};

export const loader = () => json({});

export default function ProjectsPage() {
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

  const handleNewApp = () => {
    window.location.href = '/';
  };

  const handleAppClick = (app: { id: string }) => {
    window.location.href = `/app/${app.id}`;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted">
      {/* Sidebar */}
      <ClientOnly>{() => <Menu />}</ClientOnly>

      {/* Main content */}
      <main
        className={classNames('flex-1 flex flex-col overflow-hidden transition-all duration-300', {
          'lg:ml-[60px]': !isSmallViewport && isSidebarCollapsed,
          'lg:ml-[260px]': !isSmallViewport && !isSidebarCollapsed,
        })}
      >
        {isSmallViewport && <Header />}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <AppGallery variant="all" onNewApp={handleNewApp} onAppClick={handleAppClick} />
        </div>
      </main>
    </div>
  );
}
