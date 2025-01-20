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
        <div className="max-w-3xl mx-auto px-6 py-12 prose prose-invert">
          <h1 className="text-4xl font-bold mb-8">About Nut</h1>

          <p className="mb-6">
            Nut is an{' '}
            <a
              href="https://github.com/replayio/bolt"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              open source fork
            </a>{' '}
            of{' '}
            <a
              href="https://bolt.new"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bolt.new
            </a>{' '}
            for helping you develop full stack apps using AI. AI developers frequently struggle with fixing
            even simple bugs when they don't know the cause, and get stuck making ineffective changes
            over and over. We want to crack these tough nuts, so to speak, so you can get back to building.
          </p>

          <p className="mb-6">
            When you ask Nut to fix a bug, it creates a{' '}
            <a
              href="https://replay.io"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Replay.io
            </a>{' '}
            recording of your app and whatever you did to produce the bug. The recording captures all the runtime
            behavior of your app, which is analyzed to explain the bug's root cause.
            This explanation is given to the AI developer so it has context to write a good fix.
          </p>

          <p className="mb-6">
            These are early days for Nut and it doesn't do much yet. To help with development
            we're building a public collection of problems that AIs get stuck on, which you can browse or submit
            new problems to using the sidebar menu.
          </p>

          <p>
            Nut is being developed by the{' '}
            <a
              href="https://replay.io"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Replay.io
            </a>{' '}
            team. We'd love to hear from you! Reach us at{' '}
            <a
              href="mailto:hi@replay.io"
              className="text-bolt-elements-accent underline hover:no-underline"
            >
              hi@replay.io
            </a>{' '}
            or fill out our{' '}
            <a
              href="https://replay.io/contact"
              className="text-bolt-elements-accent underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              contact form
            </a>{' '}
            and we'll be in touch.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default AboutPage;
