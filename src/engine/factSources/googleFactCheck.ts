import type { FactCheckSource } from '../types';
import { corsFetchJson } from './corsFetch';

const GOOGLE_FACTCHECK_URL = 'https://toolbox.google.com/factcheck/api/search';

interface GCFArticle {
  title?: string;
  textualRating?: string;
  url?: string;
  publisher?: { name?: string };
}

interface GCFResult {
  searchResult?: {
    item?: Array<{
      article?: GCFArticle[];
    }>;
  };
}

export async function googleFactCheck(claim: string): Promise<FactCheckSource | null> {
  const data = await corsFetchJson(`${GOOGLE_FACTCHECK_URL}?query=${encodeURIComponent(claim)}`, 8000);
  if (!data) return null;

  const items = (data as GCFResult)?.searchResult?.item || [];
  if (items.length === 0) return null;

  const first = items[0]?.article?.[0];
  if (!first?.title) return null;

  const rating = (first.textualRating || '').toLowerCase();
  const isFalse = /false|incorrect|misleading|pants on fire/i.test(rating);
  const isTrue = /true|correct|accurate/i.test(rating);

  return {
    name: `Google Fact Check: ${first.publisher?.name || 'Fact Check'}`,
    url: first.url || `https://toolbox.google.com/factcheck/search?query=${encodeURIComponent(claim)}`,
    snippet: first.title,
    result: isFalse ? 'contradicted' : isTrue ? 'supported' : 'unverified',
  };
}
