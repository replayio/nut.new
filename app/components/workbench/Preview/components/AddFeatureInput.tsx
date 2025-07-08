import React, { useState } from 'react';
import { classNames } from '~/utils/classNames';

interface AddFeatureInputProps {
  onAddFeature: (featureDescription: string) => void;
}

export const AddFeatureInput: React.FC<AddFeatureInputProps> = ({ onAddFeature }) => {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (input.trim()) {
      onAddFeature(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={classNames('relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg')}>
      <textarea
        className={classNames(
          'w-full pl-4 pt-4 pr-4 pb-4 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
          'transition-all duration-200',
          'hover:border-bolt-elements-focus',
        )}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a new feature..."
        rows={2}
        style={{
          minHeight: '60px',
          maxHeight: '120px',
        }}
      />
      <div className="flex justify-between items-center text-sm p-4 pt-2">
        <div className="text-xs text-bolt-elements-textTertiary">
          Press <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Enter</kbd> to add
          feature
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className={classNames('px-3 py-1.5 rounded text-sm font-medium transition-all', {
            'bg-green-500 hover:bg-green-600 text-white': !!input.trim(),
            'bg-bolt-elements-background-depth-3 text-bolt-elements-textTertiary cursor-not-allowed': !input.trim(),
          })}
        >
          Add Feature
        </button>
      </div>
    </div>
  );
};
