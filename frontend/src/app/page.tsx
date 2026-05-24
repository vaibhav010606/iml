'use client';

import { useState, FormEvent } from 'react';
import SearchBar from '@/components/SearchBar';
import ResultsContainer from '@/components/ResultsContainer';
import { SearchResult } from '@/components/ResultCard';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container">
      <div className="header">
        <h1>Enterprise Semantic Search</h1>
        <p>FAISS PQ Accelerated Log Analytics</p>
      </div>

      <SearchBar 
        query={query} 
        setQuery={setQuery} 
        onSearch={handleSearch} 
        isLoading={isLoading} 
      />

      <ResultsContainer 
        results={results} 
        isLoading={isLoading} 
        hasSearched={hasSearched} 
        error={error} 
      />
    </main>
  );
}
