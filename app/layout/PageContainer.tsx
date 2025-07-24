import React from 'react';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <div className="h-full w-full flex flex-col bg-bolt-elements-background-depth-1 dark:bg-black overflow-hidden fixed top-0 left-0 right-0 bottom-0">
      <Header />
      <BackgroundRays />
      <div className="flex-1 calc(h-full - 54px) w-full page-content">{children}</div>
    </div>
  );
};
