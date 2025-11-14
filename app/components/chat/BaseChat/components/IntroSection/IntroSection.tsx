import React, { useState, useMemo } from 'react';
import { CategorySelector, type IntroSectionCategory } from './CategorySelector';
import { AppCard } from './AppCard';
import { referenceApps } from '~/lib/replay/ReferenceApps';

export const IntroSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const categories = useMemo(() => {
    const sectionCategories: IntroSectionCategory[] = [];
    for (const { categories } of referenceApps) {
      for (const category of categories) {
        const existing = sectionCategories.find((c) => c.name === category);
        if (existing) {
          existing.count++;
        } else {
          sectionCategories.push({ name: category, count: 1 });
        }
      }
    }
    sectionCategories.push({ name: 'All', count: referenceApps.length });
    return sectionCategories;
  }, []);

  const filteredApps = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }
    if (selectedCategory === 'All') {
      return referenceApps;
    }
    return referenceApps.filter((app) =>
      app.categories.some((category) => category === selectedCategory),
    );
  }, [selectedCategory]);

  return (
    <div id="intro" className="max-w-4xl mx-auto px-6 lg:px-8 mt-8 mb-4">
      <div className="text-center mb-4">
        <h1 className="text-4xl lg:text-7xl font-bold text-bolt-elements-textHeading mb-6 animate-fade-in animation-delay-100 leading-tight">
          Own your tools
        </h1>

        <p className="text-lg lg:text-xl mb-10 text-bolt-elements-textSecondary animate-fade-in animation-delay-200 leading-relaxed max-w-2xl mx-auto">
          Build and customize web apps for you and your team in minutes
        </p>

        <CategorySelector
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      </div>

      {filteredApps.length > 0 && (
        <div className="space-y-6 animate-fade-in animation-delay-400 mb-8">
          {filteredApps.map((app, index) => (
            <AppCard
              key={app.appName}
              appName={app.appName}
              description={app.description}
              bulletPoints={app.bulletPoints}
              photo={app.photo}
              appId={app.appId}
              photoOnLeft={index % 2 === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};
