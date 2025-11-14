import React from 'react';
import { classNames } from '~/utils/classNames';

interface Category {
  name: string;
  count: number;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory?: string;
  onCategorySelect?: (categoryName: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8 animate-fade-in animation-delay-300">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.name;
        return (
          <button
            key={category.name}
            onClick={() => onCategorySelect?.(category.name)}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              {
                'bg-purple-100/50 dark:bg-purple-500/10 text-bolt-elements-textHeading border border-transparent hover:border-bolt-elements-borderColor/50':
                  !isSelected,
                'bg-transparent text-bolt-elements-textHeading border-2 border-purple-600 dark:border-purple-400':
                  isSelected,
              },
            )}
          >
            <span className="text-bolt-elements-textHeading">{category.name}</span>
            <span className="text-bolt-elements-textSecondary ml-1">({category.count})</span>
          </button>
        );
      })}
    </div>
  );
};

