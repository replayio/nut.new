import { memo, forwardRef, type ForwardedRef } from 'react';
import { classNames } from '~/utils/classNames';

type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface BaseIconButtonProps {
  size?: IconSize;
  className?: string;
  iconClassName?: string;
  disabledClassName?: string;
  title?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  style?: React.CSSProperties;
}

type IconButtonWithoutChildrenProps = {
  icon: string;
  children?: undefined;
  testId?: string;
} & BaseIconButtonProps;

type IconButtonWithChildrenProps = {
  icon?: undefined;
  children: string | JSX.Element | JSX.Element[];
  testId?: string;
} & BaseIconButtonProps;

type IconButtonProps = IconButtonWithoutChildrenProps | IconButtonWithChildrenProps;

// Componente IconButton com suporte a refs
export const IconButton = memo(
  forwardRef(
    (
      {
        icon,
        size = 'xl',
        className,
        iconClassName,
        disabledClassName,
        disabled = false,
        testId,
        title,
        onClick,
        children,
        style,
      }: IconButtonProps,
      ref: ForwardedRef<HTMLButtonElement>,
    ) => {
      return (
        <button
          ref={ref}
          className={classNames(
            'flex items-center justify-center text-bolt-elements-textSecondary bg-bolt-elements-background-depth-2 enabled:hover:text-bolt-elements-textPrimary rounded-xl p-2 enabled:hover:bg-bolt-elements-background-depth-3 disabled:cursor-not-allowed transition-all duration-200 shadow-sm enabled:hover:shadow-md enabled:hover:scale-105 border border-bolt-elements-borderColor group',
            {
              [classNames('opacity-50', disabledClassName)]: disabled,
            },
            className,
          )}
          title={title}
          disabled={disabled}
          data-testid={testId || 'icon-button'}
          onClick={(event) => {
            if (disabled) {
              return;
            }

            onClick?.(event);
          }}
          style={style}
        >
          {children ? (
            children
          ) : (
            <div
              className={classNames(
                icon,
                getIconSize(size),
                'transition-transform duration-200 group-hover:scale-110',
                iconClassName,
              )}
            ></div>
          )}
        </button>
      );
    },
  ),
);

function getIconSize(size: IconSize) {
  if (size === 'sm') {
    return 'text-sm';
  } else if (size === 'md') {
    return 'text-base';
  } else if (size === 'lg') {
    return 'text-lg';
  } else if (size === 'xl') {
    return 'text-xl';
  } else {
    return 'text-2xl';
  }
}
