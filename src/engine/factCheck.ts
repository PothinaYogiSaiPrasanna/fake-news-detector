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

const ROLE_QUALIFIERS = /^(current|former|previous|next|acting|new|incumbent|designate)\s+/i;

const INTERROGATIVES = /\b(who|what|which|when|where|why|how|whom|whose)\b/i;

const QUESTION_RE = /^(who|what|which|when|where|why|how|is|are|was|were|do|does|did|has|have|had|can|could|will|would|shall|should|may|might)\b/i;

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

function isQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.endsWith('?')) return true;
  if (QUESTION_RE.test(trimmed)) return true;
  return false;
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
    const role = match[2].trim();
    const location = (match[3] || '').trim();

    if (INTERROGATIVES.test(subject)) continue;
    if (['who', 'what', 'which', 'when', 'where', 'why', 'how'].includes(subject.toLowerCase())) continue;

    claims.push({
      subject,
      role,
      location,
      fullMatch: match[0],
      index: match.index,
    });
  }
  return claims;
}

function normalizeRole(role: string): { clean: string; full: string } {
  const cleaned = role.replace(ROLE_QUALIFIERS, '').trim();
  const lower = cleaned.toLowerCase();
  if (POSITION_ALIASES[lower]) return { clean: POSITION_ALIASES[lower], full: cleaned };
  if (POSITION_ALIASES[role.toLowerCase()]) return { clean: POSITION_ALIASES[role.toLowerCase()], full: role };
  return { clean: cleaned, full: role };
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

async function getEntityLabel(id: string): Promise<string | null> {
  const data = await fetchJson(`${WIKIDATA_API}/${id}.json`);
  if (!data) return null;
  return data?.entities?.[id]?.labels?.en?.value || null;
}

async function getCurrentOfficeholder(
  wikidataId: string,
): Promise<{ personId: string; personName: string } | null> {
  const entityData = await fetchJson(`${WIKIDATA_API}/${wikidataId}.json`);
  const claims = entityData?.entities?.[wikidataId]?.claims;
  if (!claims?.P1308) return null;

  const currentHolder = claims.P1308.find((c: any) => !c?.qualifiers?.P582);
  if (!currentHolder) return null;

  const personId = currentHolder?.mainsnak?.datavalue?.value?.id;
  if (!personId) return null;

  const personName = await getEntityLabel(personId);
  if (!personName) return null;

  return { personId, personName };
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
  if (isQuestion(text)) {
    return {
      spans: [],
      details: 'Questions are not evaluated for factual accuracy.',
      score: 100,
      hasFactualError: false,
      sources: [],
    };
  }

  const claims = extractClaims(text);
  const spans: SuspiciousSpan[] = [];

  if (claims.length === 0) {
    return { spans, details: 'No factual claims detected.', score: 100, hasFactualError: false, sources: [] };
  }
  let verifiedCorrect = 0;
  let contradicted = 0;
  const allCorrections: CorrectionEvidence[] = [];

  for (const claim of claims) {
    const { clean: normalizedRole } = normalizeRole(claim.role);
    const searchTitle = claim.location
      ? `${normalizedRole} of ${fmtTitle(claim.location)}`
      : normalizedRole;

    const wikidataId = await getWikidataId(searchTitle);
    if (!wikidataId) continue;

    const officeholder = await getCurrentOfficeholder(wikidataId);
    if (!officeholder) continue;

    const subjectLower = claim.subject.toLowerCase().trim();
    const holderLower = officeholder.personName.toLowerCase().trim();

    if (subjectLower === holderLower || subjectLower.includes(holderLower) || holderLower.includes(subjectLower)) {
      verifiedCorrect++;
      continue;
    }

    contradicted++;
    const correctFact = `The current ${searchTitle} is ${officeholder.personName}, not ${claim.subject}.`;
    const sources = await collectSources(searchTitle, officeholder.personId, officeholder.personName);

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
  }

  const allSources = allCorrections.flatMap(c => c.sources);
  const uniqueSources = allSources.filter((s, i, arr) =>
    arr.findIndex(x => x.url === s.url) === i
  ).slice(0, 5);

  if (contradicted === 0) {
    const details = verifiedCorrect > 0
      ? `Verified ${verifiedCorrect} claim${verifiedCorrect > 1 ? 's' : ''}. All factually correct.`
      : 'No factual claims could be verified.';
    return { spans, details, score: 100, hasFactualError: false, sources: [] };
  }

  const total = verifiedCorrect + contradicted;
  const score = Math.max(5, Math.round(100 - (contradicted / total) * 95));
  const correctionText = allCorrections.map(c => c.correctFact).join(' ');
  const details = `Found ${contradicted} factual error${contradicted > 1 ? 's' : ''}. ${correctionText}`;

  return { spans, details, score, hasFactualError: true, sources: uniqueSources };
}
