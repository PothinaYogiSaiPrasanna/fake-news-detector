import type { SuspiciousSpan } from './types';

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIDATA_API = 'https://www.wikidata.org/wiki/Special:EntityData';

const POSITION_PATTERNS = [
  /(\w[\w\s.]+)\s+is\s+(?:the\s+|an?\s+)?(\w[\w\s]+?)(?:\s+of\s+(\w[\w\s]+))?/gi,
];

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

function extractClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const seen = new Set<string>();
  for (const pattern of POSITION_PATTERNS) {
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

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function findWikidataItem(title: string): Promise<string | null> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(title)}&format=json&origin=*`;
  try {
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages || {};
    for (const id of Object.keys(pages)) {
      const wb = pages[id]?.pageprops?.wikibase_item;
      if (wb) return wb;
    }
    return null;
  } catch {
    return null;
  }
}

async function getOfficeHolder(positionTitle: string): Promise<{ name: string; source: string } | null> {
  const wikidataId = await findWikidataItem(positionTitle);
  if (!wikidataId) return null;

  const entityData = await fetchJson(`${WIKIDATA_API}/${wikidataId}.json`);
  if (!entityData) return null;

  const claims = entityData?.entities?.[wikidataId]?.claims;
  if (!claims) return null;

  const officeHolderClaim = claims.P1308?.find((c: any) => {
    const quals = c?.qualifiers || {};
    return !quals.P582;
  });

  if (!officeHolderClaim) return null;

  const holderId = officeHolderClaim?.mainsnak?.datavalue?.value?.id;
  if (!holderId) return null;

  const holderData = await fetchJson(`${WIKIDATA_API}/${holderId}.json`);
  if (!holderData) return null;

  const name = holderData?.entities?.[holderId]?.labels?.en?.value;
  if (!name) return null;

  return { name, source: `https://www.wikidata.org/wiki/${holderId}` };
}

async function verifyViaWikiSummary(
  subject: string, role: string, location: string,
): Promise<{ contradicted: boolean; correctInfo: string | null }> {
  const normalizedRole = normalizeRole(role);
  let searchTitle = normalizedRole;
  if (location) {
    const locFormatted = location.split(/\s+/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    searchTitle = `${normalizedRole} of ${locFormatted}`;
  }

  const summary = await fetchJson(`${WIKI_API}/${encodeURIComponent(searchTitle)}`);
  if (!summary?.extract) {
    return { contradicted: false, correctInfo: null };
  }

  const extract = summary.extract as string;
  const subjectLower = subject.toLowerCase();

  let subjectFound = false;
  const subjectWords = subjectLower.split(/\s+/);
  if (subjectWords.length === 1) {
    const regex = new RegExp(`\\b${subjectWords[0]}\\b`, 'i');
    subjectFound = regex.test(extract);
  } else {
    subjectFound = subjectWords.every(w => extract.toLowerCase().includes(w));
  }

  if (!subjectFound) {
    return { contradicted: true, correctInfo: `Wikipedia page for "${searchTitle}" does not mention "${subject}"` };
  }

  return { contradicted: false, correctInfo: null };
}

async function verifyViaWikidata(
  subject: string, role: string, location: string,
): Promise<{ contradicted: boolean; correctInfo: string | null }> {
  const normalizedRole = normalizeRole(role);
  let searchTitle = normalizedRole;
  if (location) {
    const locFormatted = location.split(/\s+/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    searchTitle = `${normalizedRole} of ${locFormatted}`;
  }

  const holder = await getOfficeHolder(searchTitle);
  if (!holder) return { contradicted: false, correctInfo: null };

  const subjectLower = subject.toLowerCase();
  const holderLower = holder.name.toLowerCase();

  if (subjectLower !== holderLower &&
      !holderLower.includes(subjectLower) &&
      !subjectLower.includes(holderLower)) {
    return {
      contradicted: true,
      correctInfo: `The current ${searchTitle} is ${holder.name}, not ${subject}.`,
    };
  }

  return { contradicted: false, correctInfo: null };
}

export async function factCheck(text: string): Promise<{
  spans: SuspiciousSpan[];
  details: string;
  score: number;
  hasFactualError: boolean;
}> {
  const spans: SuspiciousSpan[] = [];
  const claims = extractClaims(text);

  if (claims.length === 0) {
    return { spans, details: 'No factual claims detected.', score: 100, hasFactualError: false };
  }

  let totalChecks = 0;
  let failedChecks = 0;
  const corrections: string[] = [];

  for (const claim of claims) {
    totalChecks++;

    const wikiResult = await verifyViaWikiSummary(claim.subject, claim.role, claim.location);
    if (wikiResult.contradicted) {
      failedChecks++;
      corrections.push(wikiResult.correctInfo!);
      spans.push({
        start: claim.index,
        end: claim.index + claim.fullMatch.length,
        text: claim.fullMatch,
        severity: 'high',
        reason: wikiResult.correctInfo!,
        category: 'factual error',
      });
      continue;
    }

    const wikidataResult = await verifyViaWikidata(claim.subject, claim.role, claim.location);
    if (wikidataResult.contradicted) {
      failedChecks++;
      corrections.push(wikidataResult.correctInfo!);
      spans.push({
        start: claim.index,
        end: claim.index + claim.fullMatch.length,
        text: claim.fullMatch,
        severity: 'high',
        reason: wikidataResult.correctInfo!,
        category: 'factual error',
      });
    }
  }

  if (failedChecks === 0) {
    return {
      spans,
      details: `Verified ${totalChecks} claim${totalChecks > 1 ? 's' : ''}. No factual contradictions found.`,
      score: 100,
      hasFactualError: false,
    };
  }

  const score = Math.max(5, Math.round(100 - (failedChecks / totalChecks) * 95));
  const correctionText = corrections.join(' ');
  const details = `Found ${failedChecks} factual error${failedChecks > 1 ? 's' : ''}. ${correctionText}`;

  return { spans, details, score, hasFactualError: true };
}
