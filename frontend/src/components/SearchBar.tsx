import { FormEvent } from 'react';

interface SearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  onSearch: (e: FormEvent) => void;
  isLoading: boolean;
}

export default function SearchBar({ query, setQuery, onSearch, isLoading }: SearchBarProps) {
  return (
    <form className="search-container" onSubmit={onSearch}>
      <input
        type="text"
        className="search-input"
        placeholder="Search system logs, package events, or errors..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isLoading}
        autoFocus
      />
      <button 
        type="submit" 
        className="search-button"
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}
