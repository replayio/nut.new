import React from 'react';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <div className="h-screen w-full flex flex-col bg-bolt-elements-background-depth-1 dark:bg-black overflow-hidden">
      <Header />
      <BackgroundRays />
      <div className="flex-1 w-full page-content">{children}</div>
    </div>
  );
};
