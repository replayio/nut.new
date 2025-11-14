import React, { useState } from 'react';
import { CategorySelector } from './CategorySelector';

export const IntroSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Productivity');

  const categories = [
    { name: 'Productivity', count: 12 },
    { name: 'Health & Fitness', count: 9 },
    { name: 'Business', count: 8 },
    { name: 'Social Networking', count: 7 },
    { name: 'Marketplace', count: 6 },
    { name: 'Ecommerce', count: 10 },
    { name: 'Finance', count: 11 },
  ];

  return (
    <div id="intro" className="max-w-4xl mx-auto text-center px-6 lg:px-8 mt-8">
      <h1 className="text-4xl lg:text-7xl font-bold text-bolt-elements-textHeading mb-6 animate-fade-in animation-delay-100 leading-tight">
        Own your tools
      </h1>

      <p className="text-lg lg:text-xl mb-10 text-bolt-elements-textSecondary animate-fade-in animation-delay-200 leading-relaxed max-w-2xl mx-auto">
        Build and customize web apps for you and your business in minutes
      </p>

      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
    </div>
  );
};
