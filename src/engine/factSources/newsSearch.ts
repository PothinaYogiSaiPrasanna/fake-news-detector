import type { FactCheckSource } from '../types';
import { corsFetch } from './corsFetch';

const NEWS_URL = 'https://news.google.com/rss/search';

interface NewsItem {
  title: string;
  link: string;
  source: string;
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>[\s\S]*?<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[0];
    const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i.exec(itemXml);
    const linkMatch = /<link>(.*?)<\/link>/i.exec(itemXml);
    const sourceMatch = /<source>(.*?)<\/source>/i.exec(itemXml);

    const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
    const link = (linkMatch?.[1] || '').trim();
    const source = (sourceMatch?.[1] || '').trim();

    if (title) {
      items.push({ title, link, source });
    }
  }

  return items;
}

export async function newsSearch(claim: string): Promise<FactCheckSource[]> {
  const results: FactCheckSource[] = [];
  const xml = await corsFetch(`${NEWS_URL}?q=${encodeURIComponent(claim)}&hl=en-US&gl=US&ceid=US:en`, 8000);
  if (!xml) return results;

  const items = parseRSS(xml).slice(0, 3);
  const claimLower = claim.toLowerCase();

  for (const item of items) {
    const titleLower = item.title.toLowerCase();
    let result: 'supported' | 'contradicted' | 'unverified' = 'unverified';

    if (claimLower.split(/\s+/).some(w => w.length > 3 && titleLower.includes(w))) {
      result = 'supported';
    }

    results.push({
      name: `Google News: ${item.source || 'News'}`,
      url: item.link,
      snippet: item.title,
      result,
    });
  }

  return results;
}
