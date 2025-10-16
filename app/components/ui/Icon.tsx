import { LucideIcon } from 'lucide-react';
import { cn } from '~/lib/utils';

interface IconProps {
  icon: LucideIcon;
  className?: string;
  size?: number | string;
}

export function Icon({ icon: IconComponent, className, size = 20 }: IconProps) {
  return (
    <IconComponent 
      className={cn('inline-block', className)} 
      size={size}
    />
  );
}

// Common icons used in your app
export { 
  Check, 
  X, 
  Rocket, 
  WarningCircle, 
  CheckBold,
  WarningCircleBold,
  RocketLaunch,
  // Add more icons as needed
} from 'lucide-react';
