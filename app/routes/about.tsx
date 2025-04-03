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
        <div className="max-w-3xl mx-auto px-6 py-12 prose dark:text-gray-200 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-bolt-elements-accent">
          <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-200">About Nut</h1>

          <p className="mb-6">
            Nut is an agentic app builder for reliably developing full stack apps using AI.
            When you ask Nut to build or change an app, it will do its best to get the code
            changes right the first time. Afterwards it will check the app to make sure it's
            working as expected, writing tests and fixing problems those tests uncover.
          </p>

          <p className="mb-6">
            You can also ask Nut to fix bugs. Nut will create a{' '}
            <a
              href="https://replay.io"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Replay.io
            </a>{' '}
            recording of your app and whatever you did to produce the bug. The recording captures all the runtime
            behavior of your app, which is analyzed to explain the bug's root cause. This explanation is given to the AI
            developer so it has context to write a good fix.
          </p>

          <p className="mb-6">
            Nut is being developed by the{' '}
            <a
              href="https://replay.io"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Replay.io
            </a>{' '} team.
            We'd love to hear from you! Leave us some feedback at the top of the page,
            join our{' '}
            <a
              href="https://www.replay.io/discord"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>{' '}
            or reach us at {' '}
            <a href="mailto:hi@replay.io" className="text-bolt-elements-accent underline hover:no-underline">
              hi@replay.io
            </a>.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default AboutPage;
