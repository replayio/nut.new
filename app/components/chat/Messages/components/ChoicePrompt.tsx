import React, { useMemo, useState } from 'react';

interface ChoicePromptProps {
  title?: string;
  description?: string;
  options: string[];
  selectionMode: 'checkbox' | 'radio';
  onChange?: (option: string, checked: boolean) => void;
}

export function ChoicePrompt({ title, description, options, selectionMode, onChange }: ChoicePromptProps) {
  const groupName = useMemo(() => `choice-${Math.random().toString(36).slice(2)}`, []);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const disabled = !onChange;

  const handleToggle = (option: string) => {
    if (selectionMode === 'checkbox') {
      const next = new Set(selectedSet);
      if (next.has(option)) {
        next.delete(option);
        onChange?.(option, false);
      } else {
        next.add(option);
        onChange?.(option, true);
      }
      setSelectedSet(next);
    } else {
      // radio
      const previouslySelected = Array.from(selectedSet);
      const next = new Set<string>([option]);
      previouslySelected.forEach((o) => {
        if (o !== option) {
          onChange?.(o, false);
        }
      });
      onChange?.(option, true);
      setSelectedSet(next);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {title && <div className="text-sm font-semibold text-bolt-elements-textHeading">{title}</div>}
      {description && <div className="text-sm text-bolt-elements-textSecondary">{description}</div>}
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const id = `${groupName}-${option}`;
          const checked = selectedSet.has(option);
          return (
            <label
              key={id}
              htmlFor={id}
              className="flex items-center gap-3 p-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 hover:border-bolt-elements-focus/50 cursor-pointer transition-colors duration-150"
            >
              <input
                id={id}
                name={groupName}
                type={selectionMode === 'checkbox' ? 'checkbox' : 'radio'}
                className="accent-blue-600"
                checked={checked}
                onChange={() => handleToggle(option)}
                disabled={disabled}
              />
              <span className="text-sm text-bolt-elements-textPrimary">{option}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
