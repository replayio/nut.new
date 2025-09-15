import React, { useEffect } from 'react';
import { Header } from '~/components/header/Header';
import { Footer } from '~/components/footer/Footer';
import BackgroundRays from '~/components/ui/BackgroundRays';
import useViewport from '~/lib/hooks/useViewport';
import { chatStore } from '~/lib/stores/chat';
import { useStore } from '@nanostores/react';
import BrokenDreamsBanner from '~/components/broken-dreams/BrokenDreamsBanner';
import { userStore } from '~/lib/stores/userAuth';
import { useLocation } from '@remix-run/react';

interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  const isSmallViewport = useViewport(600);
  const chatStarted = useStore(chatStore.started);
  const user = useStore(userStore.user);
  const location = useLocation();

  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  return (
    <div className="w-full flex flex-col bg-bolt-elements-background-depth-1 dark:bg-black app-height">
      {!chatStarted && !user && location.pathname !== '/rebuild-broken-dreams' && <BrokenDreamsBanner />}
      <Header />
      <BackgroundRays />
      <div className="flex-1 w-full page-content overflow-hidden">{children}</div>
      {!chatStarted && !isSmallViewport && <Footer />}
    </div>
  );
};
