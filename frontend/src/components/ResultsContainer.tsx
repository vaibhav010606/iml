import ResultCard, { SearchResult } from './ResultCard';

interface ResultsContainerProps {
  results: SearchResult[];
  isLoading: boolean;
  hasSearched: boolean;
  error: string | null;
}

export default function ResultsContainer({ results, isLoading, hasSearched, error }: ResultsContainerProps) {
  if (isLoading) {
    return (
      <div className="results-container">
        {[1, 2, 3].map((i) => (
          <div key={i} className="result-card skeleton">
            <div className="skeleton-title" />
            <div className="skeleton-text" />
            <div className="skeleton-text" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
      </div>
    );
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="empty-state">
        <p>No log entries found for this query.</p>
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  return (
    <div className="results-container">
      {results.map((result) => (
        <ResultCard key={result.doc_id} result={result} />
      ))}
    </div>
  );
}
