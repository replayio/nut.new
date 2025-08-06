import { useState } from 'react';
import { SearchInput } from '~/components/chat/SearchInput/SearchInput';
import { ExampleLibraryApps } from '~/components/app-library/ExampleLibraryApps';

export const Arboretum = () => {
  const [filterText, setFilterText] = useState('');

  return (
    <div className="relative flex flex-col items-center">
      <div className="text-2xl lg:text-4xl font-bold text-bolt-elements-textHeading mt-8 mb-4 animate-fade-in text-center max-w-chat mx-auto">
        Arboretum
      </div>
      <div className="text-bolt-elements-textSecondary text-center max-w-chat mx-auto">
        Browse these auto-generated apps for a place to start
      </div>
      <SearchInput onSearch={setFilterText} />
      <ExampleLibraryApps filterText={filterText} />
    </div>
  );
};
