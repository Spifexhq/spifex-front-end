import { useState } from 'react';

function useDropdownFilter<T>(items: T[], filterKey: keyof T) {
  const [filterText, setFilterText] = useState<string>('');

  const filteredItems = items.filter(item =>
    (item[filterKey] as string).toLowerCase().includes(filterText.toLowerCase())
  );

  return {
    filterText,
    setFilterText,
    filteredItems,
  };
}

export default useDropdownFilter;
