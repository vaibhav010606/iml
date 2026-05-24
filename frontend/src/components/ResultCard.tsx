import React from 'react';

export type SearchResult = {
  rank: number;
  doc_id: number;
  source: string;
  score: number;
  snippet: string;
};

export default function ResultCard({ result }: { result: SearchResult }) {
  // Determine score styling. FAISS L2 distance: lower is better (more similar)
  let scoreClass = 'score-low';
  if (result.score < 0.9) scoreClass = 'score-high';
  else if (result.score < 1.05) scoreClass = 'score-med';

  return (
    <div className="result-card">
      <div className="result-header">
        <div className="result-title">
          <span className="result-source">{result.source}</span>
          <span>Log Entry #{result.doc_id}</span>
        </div>
        <div className={`result-score ${scoreClass}`}>
          Score: {result.score.toFixed(4)}
        </div>
      </div>
      <div className="result-snippet">
        {result.snippet.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
