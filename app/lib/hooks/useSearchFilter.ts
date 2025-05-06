import { useState, useMemo, useCallback } from 'react';
import { debounce } from '~/utils/debounce';
import type { ChatSummary } from '~/lib/persistence/chats';

interface UseSearchFilterOptions {
  items: ChatSummary[];
  searchFields?: (keyof ChatSummary)[];
  debounceMs?: number;
}

export function useSearchFilter({ items = [], searchFields = ['title'], debounceMs = 300 }: UseSearchFilterOptions) {
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSetSearch = useCallback(debounce(setSearchQuery, debounceMs), []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetSearch(event.target.value);
    },
    [debouncedSetSearch],
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase();

    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];

        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }

        return false;
      }),
    );
  }, [items, searchQuery, searchFields]);

  return {
    searchQuery,
    filteredItems,
    handleSearchChange,
  };
}
