import { type AppFeature, type AppSummary } from '~/lib/persistence/messageAppSummary';

interface EventsProps {
  featureName: string | undefined;
}

const Events = ({ featureName }: EventsProps) => {
  return (
    <div className="border-t border-bolt-elements-borderColor">
      PLACEHOLDER
    </div>
  );
};

export default Events;
