import type { SuspiciousSpan } from './types';

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

const POSITION_PATTERNS = [
  /(\w[\w\s.]+)\s+is\s+(?:the\s+)?(\w[\w\s]+?)(?:\s+of\s+(\w[\w\s]+))?/gi,
];

const POSITION_TITLES: Record<string, string[]> = {
  'pm': ['Prime Minister', 'Prime minister', 'prime minister'],
  'prime minister': ['Prime Minister', 'Prime minister', 'prime minister'],
  'president': ['President', 'president'],
  'ceo': ['CEO', 'Chief Executive Officer'],
  'chairman': ['Chairman', 'chairman'],
  'governor': ['Governor', 'governor'],
  'mayor': ['Mayor', 'mayor'],
  'senator': ['Senator', 'senator'],
  'minister': ['Minister', 'minister'],
  'chancellor': ['Chancellor', 'chancellor'],
  'secretary': ['Secretary', 'secretary'],
  'king': ['King', 'king'],
  'queen': ['Queen', 'queen'],
  'president-elect': ['President-elect', 'president-elect'],
  'vice president': ['Vice President', 'Vice president', 'vice president'],
  'speaker': ['Speaker', 'speaker'],
  'chief justice': ['Chief Justice', 'Chief justice', 'chief justice'],
};

async function fetchWikiSummary(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${WIKI_API}/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.extract || null;
  } catch {
    return null;
  }
}

function normalizeTitle(input: string): string {
  const trimmed = input.trim();
  if (POSITION_TITLES[trimmed.toLowerCase()]) {
    return POSITION_TITLES[trimmed.toLowerCase()][0];
  }
  return trimmed;
}

interface ExtractedClaim {
  subject: string;
  role: string;
  location: string;
  fullMatch: string;
  index: number;
}

function extractClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  for (const pattern of POSITION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
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

function wordInText(text: string, name: string): boolean {
  const lower = text.toLowerCase();
  const parts = name.toLowerCase().split(/\s+/);
  if (parts.length === 0) return false;
  return parts.every(part => lower.includes(part));
}

export async function factCheck(text: string): Promise<{
  spans: SuspiciousSpan[];
  details: string;
  score: number;
}> {
  const spans: SuspiciousSpan[] = [];
  const claims = extractClaims(text);

  if (claims.length === 0) {
    return { spans, details: 'No factual claims detected in the text.', score: 100 };
  }

  let failedChecks = 0;
  let totalChecks = 0;

  for (const claim of claims) {
    totalChecks++;
    const normalizedRole = normalizeTitle(claim.role);
    let searchTitle = normalizedRole;

    if (claim.location) {
      const locParts = claim.location.split(/\s+/);
      const locFormatted = locParts.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      searchTitle = `${normalizedRole} of ${locFormatted}`;
    }

    const summary = await fetchWikiSummary(searchTitle);
    if (!summary) {
      continue;
    }

    if (!wordInText(summary, claim.subject)) {
      failedChecks++;
      spans.push({
        start: claim.index,
        end: claim.index + claim.fullMatch.length,
        text: claim.fullMatch,
        severity: 'high',
        reason: `Claim contradicts Wikipedia: "${searchTitle}" page does not mention "${claim.subject}"`,
        category: 'factual error',
      });
    }
  }

  if (failedChecks === 0) {
    return {
      spans,
      details: totalChecks > 0
        ? `Verified ${totalChecks} claim${totalChecks > 1 ? 's' : ''} against Wikipedia.`
        : 'No factual claims could be verified.',
      score: 100,
    };
  }

  const score = Math.max(0, 100 - (failedChecks / totalChecks) * 60);
  const details = `Found ${failedChecks} of ${totalChecks} claim${totalChecks > 1 ? 's' : ''} contradicted by Wikipedia.`;
  return { spans, details, score };
}
