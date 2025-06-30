import { motion } from 'framer-motion';
import { memo } from 'react';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { genericMemo } from '~/utils/react';

interface SliderOption<T> {
  value: T;
  text: string;
  disabled?: boolean;
}

export interface SliderOptions<T> {
  left: SliderOption<T>;
  right: SliderOption<T>;
}

export interface MultiSliderOptions<T> {
  options: SliderOption<T>[];
}

interface SliderProps<T> {
  selected: T;
  options: SliderOptions<T>;
  setSelected?: (selected: T) => void;
}

interface MultiSliderProps<T> {
  selected: T;
  options: MultiSliderOptions<T>;
  setSelected?: (selected: T) => void;
}

export const Slider = genericMemo(<T,>({ selected, options, setSelected }: SliderProps<T>) => {
  const isLeftSelected = selected === options.left.value;

  return (
    <div className="flex items-center flex-wrap shrink-0 gap-1 bg-bolt-elements-background-depth-1 overflow-hidden rounded-full p-1">
      <SliderButton selected={isLeftSelected} setSelected={() => setSelected?.(options.left.value)}>
        {options.left.text}
      </SliderButton>
      <SliderButton selected={!isLeftSelected} setSelected={() => setSelected?.(options.right.value)}>
        {options.right.text}
      </SliderButton>
    </div>
  );
});

// New multi-option slider component
export const MultiSlider = genericMemo(<T,>({ selected, options, setSelected }: MultiSliderProps<T>) => {
  return (
    <div className="flex items-center flex-wrap shrink-0 gap-1 bg-bolt-elements-background-depth-1 overflow-hidden rounded-full p-1">
      {options.options.map((option) => (
        <SliderButton
          key={String(option.value)}
          selected={selected === option.value}
          disabled={option.disabled}
          setSelected={() => setSelected?.(option.value)}
        >
          {option.text}
        </SliderButton>
      ))}
    </div>
  );
});

interface SliderButtonProps {
  selected: boolean;
  disabled?: boolean;
  children: string | JSX.Element | Array<JSX.Element | string>;
  setSelected: () => void;
}

const SliderButton = memo(({ selected, disabled = false, children, setSelected }: SliderButtonProps) => {
  return (
    <button
      onClick={disabled ? undefined : setSelected}
      disabled={disabled}
      className={classNames(
        'bg-transparent text-sm px-2.5 py-0.5 rounded-full relative transition-opacity',
        disabled
          ? 'text-bolt-elements-item-contentDefault opacity-50 cursor-not-allowed'
          : selected
            ? 'text-bolt-elements-item-contentAccent'
            : 'text-bolt-elements-item-contentDefault hover:text-bolt-elements-item-contentActive',
      )}
    >
      <span className="relative z-10">{children}</span>
      {selected && !disabled && (
        <motion.span
          layoutId="pill-tab"
          transition={{ duration: 0.2, ease: cubicEasingFn }}
          className="absolute inset-0 z-0 bg-bolt-elements-item-backgroundAccent rounded-full"
        ></motion.span>
      )}
    </button>
  );
});
