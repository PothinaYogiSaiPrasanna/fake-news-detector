import type { Source, SuspiciousSpan } from './types';

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIDATA_API = 'https://www.wikidata.org/wiki/Special:EntityData';

const POSITION_ALIASES: Record<string, string> = {
  'pm': 'Prime Minister',
  'prime minister': 'Prime Minister',
  'president': 'President',
  'vp': 'Vice President',
  'vice president': 'Vice President',
  'ceo': 'Chief Executive Officer',
  'cfo': 'Chief Financial Officer',
  'cto': 'Chief Technology Officer',
  'chairman': 'Chairperson',
  'chairperson': 'Chairperson',
  'governor': 'Governor',
  'mayor': 'Mayor',
  'senator': 'Senator',
  'minister': 'Minister',
  'chancellor': 'Chancellor',
  'secretary': 'Secretary',
  'king': 'King',
  'queen': 'Queen',
  'speaker': 'Speaker',
  'chief justice': 'Chief Justice',
};

interface ExtractedClaim {
  subject: string;
  role: string;
  location: string;
  fullMatch: string;
  index: number;
}

interface CorrectionEvidence {
  correctFact: string;
  sources: Source[];
}

function extractClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();
  const patterns = [
    /(\w[\w\s.]+)\s+is\s+(?:the\s+|an?\s+)?(\w[\w\s]+?)(?:\s+of\s+(\w[\w\s]+))?/gi,
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const key = `${match.index}-${match[0].length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      claims.push({
        subject: match[1].trim(),
        role: match[2].trim(),
        location: (match[3] || '').trim(),
        fullMatch: match[0],
        index: match.index,
      });
    }
  }
  return claims;
}

function normalizeRole(role: string): string {
  const lower = role.toLowerCase().trim();
  if (POSITION_ALIASES[lower]) return POSITION_ALIASES[lower];
  return role;
}

function fmtTitle(s: string): string {
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getWikidataId(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  const data = await fetchJson(url);
  if (!data) return null;
  const pages = data?.query?.pages || {};
  for (const id of Object.keys(pages)) {
    const wb = pages[id]?.pageprops?.wikibase_item;
    if (wb) return wb;
  }
  return null;
}

async function getDescription(id: string): Promise<string | null> {
  const data = await fetchJson(`${WIKIDATA_API}/${id}.json`);
  if (!data) return null;
  return data?.entities?.[id]?.descriptions?.en?.value || null;
}

async function collectSources(
  position: string,
  actualPersonId: string,
  actualPersonName: string,
): Promise<Source[]> {
  const sources: Source[] = [];
  const seenUrls = new Set<string>();

  function addSource(title: string, url: string, snippet: string) {
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    if (sources.length < 5) {
      sources.push({ title, url: url.replace(/^http:/, 'https:'), snippet });
    }
  }

  const personDesc = await getDescription(actualPersonId);

  addSource(
    `Wikipedia: ${position}`,
    `https://en.wikipedia.org/wiki/${encodeURIComponent(position.replace(/\s+/g, '_'))}`,
    `Wikipedia article about ${position}`,
  );

  addSource(
    `Wikidata: ${actualPersonName}`,
    `https://www.wikidata.org/wiki/${actualPersonId}`,
    personDesc || `Structured data for ${actualPersonName}`,
  );

  addSource(
    `Wikipedia: ${actualPersonName}`,
    `https://en.wikipedia.org/wiki/${encodeURIComponent(actualPersonName.replace(/\s+/g, '_'))}`,
    `Wikipedia article about ${actualPersonName}`,
  );

  const listTitle = `List of ${position}s`;
  const listData = await fetchJson(`${WIKI_API}/${encodeURIComponent(listTitle)}`);
  if (listData?.extract) {
    addSource(
      `Wikipedia: ${listTitle}`,
      `https://en.wikipedia.org/wiki/${encodeURIComponent(listTitle.replace(/\s+/g, '_'))}`,
      listData.extract.slice(0, 200),
    );
  }

  const positionData = await fetchJson(`${WIKI_API}/${encodeURIComponent(position)}`);
  if (positionData?.extract) {
    const existing = sources.find(s => s.title.includes(position));
    if (existing) {
      existing.snippet = positionData.extract.slice(0, 300);
    }
  }

  return sources;
}

export async function factCheck(text: string): Promise<{
  spans: SuspiciousSpan[];
  details: string;
  score: number;
  hasFactualError: boolean;
  sources: Source[];
}> {
  const spans: SuspiciousSpan[] = [];
  const claims = extractClaims(text);

  if (claims.length === 0) {
    return { spans, details: 'No factual claims detected.', score: 100, hasFactualError: false, sources: [] };
  }

  let totalChecks = 0;
  let failedChecks = 0;
  const allCorrections: CorrectionEvidence[] = [];

  for (const claim of claims) {
    totalChecks++;
    const normalizedRole = normalizeRole(claim.role);
    let searchTitle = normalizedRole;
    if (claim.location) {
      searchTitle = `${normalizedRole} of ${fmtTitle(claim.location)}`;
    }

    const summary = await fetchJson(`${WIKI_API}/${encodeURIComponent(searchTitle)}`);
    if (summary?.extract) {
      const extract = summary.extract as string;
      const subjectWords = claim.subject.toLowerCase().split(/\s+/);
      const subjectFound = subjectWords.length === 1
        ? new RegExp(`\\b${subjectWords[0]}\\b`, 'i').test(extract)
        : subjectWords.every(w => extract.toLowerCase().includes(w));

      if (!subjectFound) {
        const wikidataId = summary?.wikibase_item
          || await getWikidataId(searchTitle);

        let actualPersonId: string | null = null;
        let actualPersonName: string | null = null;

        if (wikidataId) {
          const entityData = await fetchJson(`${WIKIDATA_API}/${wikidataId}.json`);
          const claims_data = entityData?.entities?.[wikidataId]?.claims;
          if (claims_data) {
            const holderClaim = claims_data.P1308?.find((c: any) => !c?.qualifiers?.P582);
            if (holderClaim) {
              actualPersonId = holderClaim?.mainsnak?.datavalue?.value?.id;
              if (actualPersonId) {
                const labelData = await fetchJson(`${WIKIDATA_API}/${actualPersonId}.json`);
                actualPersonName = labelData?.entities?.[actualPersonId]?.labels?.en?.value;
              }
            }
          }
        }

        let correctFact: string;
        let sources: Source[] = [];

        if (actualPersonName) {
          correctFact = `The current ${searchTitle} is ${actualPersonName}, not ${claim.subject}.`;
          sources = await collectSources(searchTitle, actualPersonId!, actualPersonName);
        } else {
          correctFact = `Wikipedia does not associate "${claim.subject}" with ${searchTitle}.`;
          const positionSummary = await fetchJson(`${WIKI_API}/${encodeURIComponent(searchTitle)}`);
          sources = [{
            title: `Wikipedia: ${searchTitle}`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTitle.replace(/\s+/g, '_'))}`,
            snippet: positionSummary?.extract?.slice(0, 300) || `Wikipedia article about ${searchTitle}`,
          }];
        }

        allCorrections.push({ correctFact, sources });

        spans.push({
          start: claim.index,
          end: claim.index + claim.fullMatch.length,
          text: claim.fullMatch,
          severity: 'high',
          reason: correctFact,
          category: 'factual error',
          sources,
        });

        failedChecks++;
      }
    }
  }

  const allSources = allCorrections.flatMap(c => c.sources);
  const uniqueSources = allSources.filter((s, i, arr) =>
    arr.findIndex(x => x.url === s.url) === i
  ).slice(0, 5);

  if (failedChecks === 0) {
    return {
      spans,
      details: `Verified ${totalChecks} claim${totalChecks > 1 ? 's' : ''}. No factual contradictions found.`,
      score: 100,
      hasFactualError: false,
      sources: [],
    };
  }

  const score = Math.max(5, Math.round(100 - (failedChecks / totalChecks) * 95));
  const correctionText = allCorrections.map(c => c.correctFact).join(' ');
  const details = `Found ${failedChecks} factual error${failedChecks > 1 ? 's' : ''}. ${correctionText}`;

  return { spans, details, score, hasFactualError: true, sources: uniqueSources };
}
