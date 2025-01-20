import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { Menu } from '~/components/sidebar/Menu.client';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { TooltipProvider } from '@radix-ui/react-tooltip';

function AboutPage() {
  return (
    <TooltipProvider>
      <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
        <BackgroundRays />
        <Header />
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div>
          Nut is an open source fork of Bolt.new designed to help you more easily fix bugs
          and make improvements to your app which AI developers struggle with. We want to be better
          at cracking tough nuts, so to speak.
        </div>
      </div>
    </TooltipProvider>
  );
}

export default AboutPage;
