import React from 'react';
import { classNames } from '~/utils/classNames';

export interface IntroSectionCategory {
  name: string;
  count: number;
}

interface CategorySelectorProps {
  categories: IntroSectionCategory[];
  selectedCategory?: string;
  onCategorySelect?: (categoryName: string | undefined) => void;
  showAlpha: boolean;
  onShowAlphaChange: (showAlpha: boolean) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  showAlpha,
  onShowAlphaChange,
}) => {
  return (
    <div className="flex flex-wrap justify-center items-center gap-3 mb-8 animate-fade-in animation-delay-300">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.name;
        return (
          <button
            key={category.name}
            onClick={() => onCategorySelect?.(isSelected ? undefined : category.name)}
            className={classNames('px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200', {
              'bg-purple-100/50 dark:bg-purple-500/10 text-bolt-elements-textHeading border border-transparent hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-purple-100/70 dark:hover:bg-purple-500/20':
                !isSelected,
              'bg-transparent text-bolt-elements-textHeading border-2 border-black dark:border-white shadow-sm':
                isSelected,
            })}
          >
            <span className="text-bolt-elements-textHeading">{category.name}</span>
            <span className="text-bolt-elements-textSecondary ml-1">({category.count})</span>
          </button>
        );
      })}
      <label className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-bolt-elements-textHeading cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-500/10 transition-all duration-200">
        <input
          type="checkbox"
          checked={showAlpha}
          onChange={(e) => onShowAlphaChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500 focus:ring-2 cursor-pointer"
        />
        <span>Include Alpha Apps</span>
      </label>
    </div>
  );
};
