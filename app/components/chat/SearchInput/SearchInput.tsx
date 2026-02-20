import React from 'react';

interface SearchInputProps {
  onSearch: (text: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onSearch }) => {
  return (
    <div
      className="placeholder-muted-foreground/70"
      style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
    >
      <input
        type="text"
        placeholder="Search"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSearch(event.currentTarget.value);
          }
        }}
        style={{
          width: '200px',
          padding: '0.5rem',
          marginTop: '0.5rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '0.9rem',
          textAlign: 'left',
        }}
      />
    </div>
  );
};
