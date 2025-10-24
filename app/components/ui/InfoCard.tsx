import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';
import { Icon } from './Icon';
import { CheckCircle, Info, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { formatPascalCaseName } from '~/utils/names';

// Add CSS keyframes for animations
const animationStyles = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideDown {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(20px);
    }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('stacked-info-card-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'stacked-info-card-animations';
  styleSheet.textContent = animationStyles;
  document.head.appendChild(styleSheet);
}

const infoCardVariants = cva('flex items-start gap-3 rounded-2xl border p-4 transition-colors', {
  variants: {
    variant: {
      default: 'bg-bolt-elements-background-depth-2 border-bolt-elements-borderColor',
      active: 'bg-bolt-elements-background-depth-2 border-bolt-elements-borderColorActive border-2',
      warning: 'bg-bolt-elements-background-depth-2 border-bolt-elements-borderColorWarning border-2',
    },
    size: {
      default: 'p-4',
      sm: 'p-3',
      lg: 'p-5',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const iconVariants = cva(
  'flex-shrink-0 rounded-full p-1 w-8 h-8 flex items-center justify-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor',
  {
    variants: {
      type: {
        success: 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
        info: 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
        warning: 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
        error: 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
        loading: 'bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary',
      },
    },
    defaultVariants: {
      type: 'success',
    },
  },
);

export interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof infoCardVariants> {
  title: string;
  description: string;
  iconType?: 'success' | 'info' | 'warning' | 'error' | 'loading';
  showActionButton?: boolean;
  onActionClick?: () => void;
  onCardClick?: () => void;
}

export interface InfoCardData {
  id: string;
  title: string;
  description: string;
  iconType?: 'success' | 'info' | 'warning' | 'error' | 'loading';
  variant?: 'default' | 'active' | 'warning';
  onActionClick?: () => void;
  onCardClick?: () => void;
}
const InfoCard = React.forwardRef<HTMLDivElement, InfoCardProps>(
  (
    {
      className,
      variant,
      size,
      title,
      description,
      iconType = 'success',
      //   showActionButton = true,
      //   onActionClick,
      onCardClick,
      ...props
    },
    ref,
  ) => {
    const getIcon = () => {
      switch (iconType) {
        case 'success':
          return CheckCircle;
        case 'info':
          return Info;
        case 'warning':
          return AlertTriangle;
        case 'error':
          return XCircle;
        case 'loading':
          return Loader2;
        default:
          return CheckCircle;
      }
    };

    const IconComponent = getIcon();

    return (
      <div
        ref={ref}
        className={cn(infoCardVariants({ variant, size, className }), {
          'cursor-pointer hover:bg-bolt-elements-background-depth-3': !!onCardClick,
        })}
        {...props}
        onClick={onCardClick}
      >
        {/* Icon */}
        <div className={cn(iconVariants({ type: iconType }))}>
          <Icon icon={IconComponent} size={16} className={iconType === 'loading' ? 'animate-spin' : ''} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight text-bolt-elements-textHeading">
            {formatPascalCaseName(title)}
          </h3>
          <p className="text-sm mt-1 leading-relaxed text-bolt-elements-textSecondary">{description}</p>
        </div>

        {/* Action Button */}
        {/* {showActionButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActionClick?.();
            }}
            className="flex-shrink-0 p-1 w-8 h-8 flex items-center justify-center rounded-full transition-colors bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor"
            aria-label="More options"
          >
            <Icon icon={MoreHorizontal} size={16} className="text-bolt-elements-textSecondary" />
          </button>
        )} */}
      </div>
    );
  },
);

InfoCard.displayName = 'InfoCard';

export { InfoCard, infoCardVariants };

// Stacked InfoCard Component
export interface StackedInfoCardProps {
  cards: Array<InfoCardData>;
  className?: string;
}

const StackedInfoCard = React.forwardRef<HTMLDivElement, StackedInfoCardProps>(({ cards, className }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [wrapperHeight, setWrapperHeight] = React.useState(80); // Default height
  const [expandedHeight, setExpandedHeight] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const hasMoreCards = cards.length > 1;

  const toggleExpanded = () => {
    if (hasMoreCards) {
      setIsAnimating(true);

      if (!isExpanded) {
        // Calculate expanded height
        const estimatedHeight = Math.min(cards.length * 100 + 40, 400); // Estimate 100px per card + padding
        setExpandedHeight(estimatedHeight);
      }

      setIsExpanded(!isExpanded);

      // Handle animation completion
      setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Match the transition duration
    }
  };

  // Measure card height and update wrapper height
  React.useEffect(() => {
    if (cardRef.current && !isExpanded) {
      const cardElement = cardRef.current;
      const cardHeight = cardElement.offsetHeight;
      // Use the larger of the measured height or minimum 80px
      setWrapperHeight(Math.max(cardHeight, 80));
    }
  }, [cards, isExpanded]);

  // Scroll to bottom when expanded
  React.useEffect(() => {
    if (isExpanded && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 0);
    }
  }, [isExpanded]);

  return (
    <div
      ref={ref}
      className={cn('relative mt-4 transition-all duration-300 ease-in-out', className, {
        'mt-10': hasMoreCards,
      })}
      style={{
        height: isExpanded ? `${expandedHeight}px` : `${wrapperHeight}px`,
        transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className={cn(
          'relative transition-all duration-200',
          hasMoreCards && !isExpanded && 'cursor-pointer hover:scale-[1.02]',
          isExpanded && 'absolute bottom-0 w-full left-0 z-20 backdrop-blur-sm',
        )}
        onMouseEnter={hasMoreCards && !isExpanded ? toggleExpanded : undefined}
        onMouseLeave={isExpanded ? toggleExpanded : undefined}
      >
        {!isExpanded ? (
          <>
            <div
              ref={cardRef}
              className="relative z-30 transition-all duration-300 ease-out"
              onMouseEnter={() => setHoveredIndex(0)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                animation:
                  isAnimating && !isExpanded ? 'slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none',
              }}
            >
              <InfoCard
                title={cards[cards.length - 1].title}
                description={cards[cards.length - 1].description}
                iconType={cards[cards.length - 1].iconType}
                variant={cards[cards.length - 1].variant}
                onActionClick={cards[cards.length - 1].onActionClick}
                className={cn('shadow-md transition-all duration-300', hoveredIndex === 0 && 'shadow-lg')}
                onCardClick={cards[cards.length - 1].onCardClick}
              />
            </div>

            {/* Background cards for stack effect */}
            {cards.length > 1 && (
              <div
                className="absolute w-full bottom-[40px] left-0 z-10 transition-all duration-300 ease-out"
                style={{
                  animation:
                    isAnimating && !isExpanded ? 'slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1) 50ms forwards' : 'none',
                }}
              >
                <InfoCard
                  title={cards[cards.length - 2].title}
                  description={cards[cards.length - 2].description}
                  iconType={cards[cards.length - 2].iconType}
                  variant={cards[cards.length - 2].variant}
                  className="shadow-md scale-90"
                />
              </div>
            )}

            {cards.length > 2 && (
              <div
                className="absolute w-full bottom-[20px] left-0 z-10 transition-all duration-300 ease-out"
                style={{
                  animation:
                    isAnimating && !isExpanded ? 'slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1) 100ms forwards' : 'none',
                }}
              >
                <InfoCard
                  title={cards[cards.length - 3].title}
                  description={cards[cards.length - 3].description}
                  iconType={cards[cards.length - 3].iconType}
                  variant={cards[cards.length - 3].variant}
                  className="shadow-md scale-95"
                />
              </div>
            )}
          </>
        ) : (
          <div
            ref={scrollContainerRef}
            className="space-y-2 flex flex-col gap-1 max-h-[60vh] overflow-y-auto"
            style={{
              animation: isAnimating ? 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none',
            }}
          >
            {cards.map((card, index) => (
              <div
                key={card.id}
                style={{
                  animation: isAnimating
                    ? `fadeInUp 300ms cubic-bezier(0.4, 0, 0.2, 1) ${index * 50}ms forwards`
                    : 'none',
                  opacity: isAnimating ? 0 : 1,
                  transform: isAnimating ? 'translateY(20px)' : 'translateY(0)',
                }}
              >
                <InfoCard
                  title={card.title}
                  description={card.description}
                  iconType={card.iconType}
                  variant={card.variant}
                  onActionClick={card.onActionClick}
                  onCardClick={card.onCardClick}
                  className="shadow-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

StackedInfoCard.displayName = 'StackedInfoCard';

export { StackedInfoCard };
