import type { FactCheckSource } from '../types';
import { corsFetchJson } from './corsFetch';

const DDG_URL = 'https://api.duckduckgo.com/';

export async function duckDuckGoSearch(claim: string): Promise<FactCheckSource | null> {
  const data = await corsFetchJson(
    `${DDG_URL}?q=${encodeURIComponent(claim)}&format=json&no_html=1&skip_disambig=1`,
    6000,
  );
  if (!data) return null;

  const abstractText = data.AbstractText as string | undefined;
  const answer = data.Answer as string | undefined;
  const sourceUrl = data.AbstractURL as string | undefined;

  const snippet = answer || abstractText;
  if (!snippet) return null;

  const claimLower = claim.toLowerCase();
  const snippetLower = snippet.toLowerCase();

  const contradicts =
    snippetLower.includes('not') ||
    snippetLower.includes('false') ||
    snippetLower.includes('incorrect') ||
    (claimLower.includes('not') === false && snippetLower.includes('no') && snippetLower.includes('claim'));

  return {
    name: 'DuckDuckGo Instant Answer',
    url: sourceUrl || `https://duckduckgo.com/?q=${encodeURIComponent(claim)}`,
    snippet: snippet.slice(0, 300),
    result: contradicts ? 'contradicted' : 'supported',
  };
}
