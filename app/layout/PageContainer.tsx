import React, { useEffect } from 'react';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import useViewport from '~/lib/hooks/useViewport';

interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  const isSmallViewport = useViewport(1024);
  // Fallback for older browsers that don't support dvh
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
    <div className="w-full flex flex-col bg-bolt-elements-background-depth-1 dark:bg-black overflow-hidden app-height">
      <Header />
      <BackgroundRays />
      <div
        className="flex-1 w-full page-content"
        style={{
          height: isSmallViewport ? 'calc(100% - 106px)' : '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};
