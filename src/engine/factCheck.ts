import type { FactCheckSource, SuspiciousSpan } from './types';
import { googleFactCheck } from './factSources/googleFactCheck';
import { duckDuckGoSearch } from './factSources/duckDuckGo';
import { newsSearch } from './factSources/newsSearch';
const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIDATA_API = 'https://www.wikidata.org/wiki/Special:EntityData';

const POSITION_ALIASES: Record<string, string> = {
  'pm': 'Prime Minister', 'prime minister': 'Prime Minister',
  'president': 'President', 'vp': 'Vice President',
  'vice president': 'Vice President', 'ceo': 'Chief Executive Officer',
  'governor': 'Governor', 'mayor': 'Mayor', 'senator': 'Senator',
  'minister': 'Minister', 'chancellor': 'Chancellor',
  'secretary': 'Secretary', 'king': 'King', 'queen': 'Queen',
  'speaker': 'Speaker', 'chief justice': 'Chief Justice',
};

const INTERROGATIVES = /\b(who|what|which|when|where|why|how)\b/i;
const ROLE_QUALIFIERS = /^(current|former|previous|next|acting|new|incumbent|designate)\s+/i;

const RELEVANT_PROPERTIES: Array<{ prop: string; label: string }> = [
  { prop: 'P140', label: 'religion' },
  { prop: 'P106', label: 'occupation' },
  { prop: 'P27', label: 'country of citizenship' },
  { prop: 'P17', label: 'country' },
  { prop: 'P21', label: 'gender' },
  { prop: 'P172', label: 'ethnic group' },
  { prop: 'P103', label: 'native language' },
];

interface ExtractedClaim {
  subject: string; role: string; location: string; fullMatch: string; index: number;
}

let fetchJsonCounter = 0;
async function fetchJson(url: string): Promise<any | null> {
  fetchJsonCounter++;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function extractClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();
  const pattern = /(\w[\w\s.]+?)\s+is\s+(?:the\s+|an?\s+)?(\w[\w\s]+?)(?:\s+of\s+(\w[\w\s]+))?\b/gi;
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const key = `${match.index}-${match[0].length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const subject = match[1].trim();
    if (INTERROGATIVES.test(subject)) continue;
    if (['who','what','which','when','where','why','how'].includes(subject.toLowerCase())) continue;
    claims.push({ subject, role: match[2].trim(), location: (match[3] || '').trim(), fullMatch: match[0], index: match.index });
  }
  return claims;
}

function normalizeRole(role: string): string {
  const cleaned = role.replace(ROLE_QUALIFIERS, '').trim();
  return POSITION_ALIASES[cleaned.toLowerCase()] || POSITION_ALIASES[role.toLowerCase()] || cleaned;
}

function fmtTitle(s: string): string {
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function getWikidataId(title: string): Promise<string | null> {
  const data = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(title)}&format=json&origin=*`);
  if (!data) return null;
  const pages = data?.query?.pages || {};
  for (const id of Object.keys(pages)) {
    const wb = pages[id]?.pageprops?.wikibase_item;
    if (wb) return wb;
  }
  return null;
}

async function getEntityLabel(id: string): Promise<string | null> {
  const data = await fetchJson(`${WIKIDATA_API}/${id}.json`);
  return data?.entities?.[id]?.labels?.en?.value || null;
}

async function getDescription(id: string): Promise<string | null> {
  const data = await fetchJson(`${WIKIDATA_API}/${id}.json`);
  return data?.entities?.[id]?.descriptions?.en?.value || null;
}

async function verifyWikidataClaim(claim: ExtractedClaim): Promise<{
  correctFact: string;
  personName: string;
  personId: string;
  positionTitle: string;
} | null> {
  const normalizedRole = normalizeRole(claim.role);
  if (!normalizedRole) return null;

  const searchTitle = claim.location
    ? `${normalizedRole} of ${fmtTitle(claim.location)}`
    : normalizedRole;

  const wikidataId = await getWikidataId(searchTitle);
  if (!wikidataId) return null;

  const entityData = await fetchJson(`${WIKIDATA_API}/${wikidataId}.json`);
  const claims_data = entityData?.entities?.[wikidataId]?.claims;
  if (!claims_data?.P1308) return null;

  const holderClaim = claims_data.P1308.find((c: any) => !c?.qualifiers?.P582);
  if (!holderClaim) return null;

  const personId = holderClaim?.mainsnak?.datavalue?.value?.id;
  if (!personId) return null;

  const personName = await getEntityLabel(personId);
  if (!personName) return null;

  return { correctFact: `The current ${searchTitle} is ${personName}.`, personName, personId, positionTitle: searchTitle };
}

async function verifyGeneralClaim(claim: ExtractedClaim): Promise<{
  contradicted: boolean;
  correctFact: string;
  personId: string;
  personName: string;
  propertyLabel: string;
  actualValue: string;
} | null> {
  const predicateLower = claim.role.toLowerCase().trim();
  const subjectTitle = fmtTitle(claim.subject);
  const subjectId = await getWikidataId(subjectTitle);
  if (!subjectId) return null;

  const subjectData = await fetchJson(`${WIKIDATA_API}/${subjectId}.json`);
  if (!subjectData) return null;

  const subjectLabel = subjectData?.entities?.[subjectId]?.labels?.en?.value || claim.subject;
  const subjectsClaims = subjectData?.entities?.[subjectId]?.claims;
  if (!subjectsClaims) return null;

  const wordMatch = (a: string, b: string) => {
    const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped(a)}\\b`, 'i').test(b);
  };

  for (const { prop, label } of RELEVANT_PROPERTIES) {
    const propClaims = subjectsClaims[prop];
    if (!propClaims || propClaims.length === 0) continue;

    for (const pc of propClaims) {
      const valueId = pc?.mainsnak?.datavalue?.value?.id;
      if (!valueId) continue;

      const valueLabel = await getEntityLabel(valueId);
      if (!valueLabel) continue;

      const valueLower = valueLabel.toLowerCase().trim();

      if (valueLower === predicateLower || wordMatch(predicateLower, valueLower) || wordMatch(valueLower, predicateLower)) {
        return null;
      }

      const correctFact = `According to Wikidata, ${subjectLabel}'s ${label} is ${valueLabel}, not ${claim.role}.`;
      return { contradicted: true, correctFact, personId: subjectId, personName: subjectLabel, propertyLabel: label, actualValue: valueLabel };
    }
  }

  return null;
}

async function gatherSources(personId: string, personName: string, positionTitle: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const sources: Array<{ title: string; url: string; snippet: string }> = [];
  const seen = new Set<string>();
  const add = (title: string, url: string, snippet: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    if (sources.length < 5) sources.push({ title, url, snippet });
  };

  const personDesc = await getDescription(personId);

  add(`Wikipedia: ${positionTitle}`, `https://en.wikipedia.org/wiki/${encodeURIComponent(positionTitle.replace(/\s+/g, '_'))}`, `Wikipedia article about ${positionTitle}`);
  add(`Wikidata: ${personName}`, `https://www.wikidata.org/wiki/${personId}`, personDesc || `Structured data for ${personName}`);
  add(`Wikipedia: ${personName}`, `https://en.wikipedia.org/wiki/${encodeURIComponent(personName.replace(/\s+/g, '_'))}`, `Wikipedia article about ${personName}`);

  const listTitle = `List of ${positionTitle}s`;
  const listData = await fetchJson(`${WIKI_API}/${encodeURIComponent(listTitle)}`);
  if (listData?.extract) add(`Wikipedia: ${listTitle}`, `https://en.wikipedia.org/wiki/${encodeURIComponent(listTitle.replace(/\s+/g, '_'))}`, listData.extract.slice(0, 200));

  const positionData = await fetchJson(`${WIKI_API}/${encodeURIComponent(positionTitle)}`);
  if (positionData?.extract) {
    const existing = sources.find(s => s.title.includes(positionTitle));
    if (existing) existing.snippet = positionData.extract.slice(0, 300);
  }

  return sources;
}

export async function factCheck(text: string): Promise<{
  spans: SuspiciousSpan[];
  details: string;
  score: number;
  hasFactualError: boolean;
  sources: Array<{ title: string; url: string; snippet: string }>;
  factCheckSources: FactCheckSource[];
}> {
  const claims = extractClaims(text);
  const spans: SuspiciousSpan[] = [];

  if (claims.length === 0) {
    return { spans, details: 'No factual claims detected.', score: 100, hasFactualError: false, sources: [], factCheckSources: [] };
  }

  const allSources: Array<{ title: string; url: string; snippet: string }> = [];
  const allFactSources: FactCheckSource[] = [];
  let contradicted = 0;
  let verified = 0;
  let corrections: string[] = [];

  const claimTexts = claims.map(c => c.fullMatch).filter(Boolean);

  for (const claim of claims) {
    const verifyResult = await verifyWikidataClaim(claim);
    if (verifyResult) {
      if (claim.subject.toLowerCase().trim() === verifyResult.personName.toLowerCase().trim() ||
          new RegExp(`\\b${verifyResult.personName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(claim.subject) ||
          new RegExp(`\\b${claim.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(verifyResult.personName)) {
        verified++;
        continue;
      }

      contradicted++;
      const correction = `The current ${verifyResult.positionTitle} is ${verifyResult.personName}, not ${claim.subject}.`;
      corrections.push(correction);
      const sources = await gatherSources(verifyResult.personId, verifyResult.personName, verifyResult.positionTitle);
      allSources.push(...sources);
      allFactSources.push({ name: `Wikidata: ${verifyResult.personName}`, url: `https://www.wikidata.org/wiki/${verifyResult.personId}`, snippet: correction, result: 'contradicted' });
      spans.push({ start: claim.index, end: claim.index + claim.fullMatch.length, text: claim.fullMatch, severity: 'high', reason: correction, category: 'factual error', sources });
      continue;
    }

    const generalResult = await verifyGeneralClaim(claim);
    if (generalResult) {
      contradicted++;
      const correction = generalResult.correctFact;
      corrections.push(correction);
      const sources = await gatherSources(generalResult.personId, generalResult.personName, generalResult.propertyLabel);
      allSources.push(...sources);
      allFactSources.push({ name: `Wikidata: ${generalResult.personName}`, url: `https://www.wikidata.org/wiki/${generalResult.personId}`, snippet: correction, result: 'contradicted' });
      spans.push({ start: claim.index, end: claim.index + claim.fullMatch.length, text: claim.fullMatch, severity: 'high', reason: correction, category: 'factual error', sources });
    }
  }

  if (claimTexts.length > 0) {
    const claimQuery = claimTexts.join(' ').slice(0, 200);

    const [gcfResult, ddgResult, newsResults] = await Promise.all([
      googleFactCheck(claimQuery).catch(() => null),
      duckDuckGoSearch(claimQuery).catch(() => null),
      newsSearch(claimQuery).catch(() => [] as FactCheckSource[]),
    ]);

    if (gcfResult) allFactSources.push(gcfResult);
    if (ddgResult) allFactSources.push(ddgResult);
    allFactSources.push(...newsResults);
  }

  const uniqueSources = allSources.filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i).slice(0, 5);
  const uniqueFactSources = allFactSources.filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i).slice(0, 5);

  if (contradicted === 0) {
    const details = verified > 0
      ? `Verified ${verified} claim${verified > 1 ? 's' : ''}. All factually correct.`
      : 'No factual claims could be verified.';
    return { spans, details, score: 100, hasFactualError: false, sources: uniqueSources.length > 0 ? uniqueSources : uniqueFactSources.slice(0, 3).map(s => ({ title: s.name, url: s.url, snippet: s.snippet })), factCheckSources: uniqueFactSources };
  }

  const total = verified + contradicted;
  const score = Math.max(5, Math.round(100 - (contradicted / total) * 95));
  const details = `Found ${contradicted} factual error${contradicted > 1 ? 's' : ''}. ${corrections.join(' ')}`;
  return { spans, details, score, hasFactualError: true, sources: uniqueSources, factCheckSources: uniqueFactSources };
}
