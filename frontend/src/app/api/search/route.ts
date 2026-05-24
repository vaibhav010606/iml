import { NextResponse } from 'next/server';

// Type definition for what the mock backend returns
type SearchResult = {
  rank: number;
  doc_id: number;
  source: string;
  score: number;
  snippet: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body.query;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Simulate network latency (MLflow inference delay)
    await new Promise(resolve => setTimeout(resolve, 800));

    // For the mock, return static, realistic-looking data
    // In Phase 6, this will be: fetch(process.env.SEARCH_API_URL, { ... })
    const mockResults: SearchResult[] = [
      {
        rank: 1,
        doc_id: 1508,
        source: 'dpkg.log.1',
        score: 0.8474,
        snippet: `startup packages configure\ninstall base-passwd:amd64 <none> 3.6.8\nstatus half-installed base-passwd:amd64 3.6.8`
      },
      {
        rank: 2,
        doc_id: 930,
        source: 'journal',
        score: 0.9642,
        snippet: `CRON[15885]: pam_unix(cron:session): session opened for user root(uid=0) by root(uid=0)`
      },
      {
        rank: 3,
        doc_id: 410,
        source: 'alternatives.log.1',
        score: 1.1003,
        snippet: `update-alternatives 2026-04-03 16:21:25: link group which updated to point to /usr/bin/which.debianutils`
      }
    ];

    return NextResponse.json({ results: mockResults });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process search' }, { status: 500 });
  }
}
