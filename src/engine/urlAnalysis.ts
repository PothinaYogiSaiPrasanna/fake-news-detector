import type { SuspiciousSpan } from './types';

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.club', '.online', '.site', '.click', '.download', '.review'];

const TRUSTED_DOMAINS = [
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'npr.org',
  'nytimes.com', 'wsj.com', 'washingtonpost.com', 'economist.com',
  'theguardian.com', 'bloomberg.com', 'cnbc.com', 'nbcnews.com',
  'abcnews.go.com', 'cbsnews.com', 'usatoday.com', 'time.com',
  'nature.com', 'science.org', 'sciencedaily.com', 'nationalgeographic.com',
  'who.int', 'un.org', 'nasa.gov', 'nih.gov', 'cdc.gov',
  'gov.uk', 'whitehouse.gov', 'state.gov',
  'wikipedia.org', 'britannica.com',
];

const SUSPICIOUS_DOMAIN_KEYWORDS = [
  'dailywire', 'breitbart', 'infowars', 'zerohedge', 'naturalnews',
  'beforeitsnews', 'prisonplanet', 'freeplanet', 'trueactivist',
  'wakingtimes', 'collective-evolution', 'globalsky', 'thelastdisaster',
];

const ALLOWED_TLDS = new Set([
  '.com', '.org', '.net', '.edu', '.gov', '.mil', '.int',
  '.co', '.io', '.ai', '.app', '.dev', '.me', '.info',
  '.uk', '.de', '.jp', '.fr', '.au', '.ca', '.ch', '.in',
  '.eu', '.tv', '.cc', '.name', '.pro', '.biz',
]);

export interface URLSignal {
  score: number;
  details: string;
  spans: SuspiciousSpan[];
}

export function analyzeURL(url: string): URLSignal {
  const spans: SuspiciousSpan[] = [];

  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  let hostname: string;
  try {
    hostname = new URL(cleanUrl).hostname.toLowerCase();
  } catch {
    return {
      score: 30,
      details: 'Invalid URL format.',
      spans: [{
        start: 0, end: url.length, text: url,
        severity: 'high', reason: 'Could not parse URL',
        category: 'url quality',
      }],
    };
  }

  const tld = '.' + hostname.split('.').pop();

  if (SUSPICIOUS_TLDS.includes(tld as any)) {
    spans.push({
      start: url.toLowerCase().indexOf(hostname),
      end: url.toLowerCase().indexOf(hostname) + hostname.length,
      text: hostname,
      severity: 'high',
      reason: `Suspicious top-level domain: ${tld}`,
      category: 'url quality',
    });
  }

  if (!ALLOWED_TLDS.has(tld) && !SUSPICIOUS_TLDS.includes(tld as any)) {
    spans.push({
      start: url.toLowerCase().indexOf(hostname),
      end: url.toLowerCase().indexOf(hostname) + hostname.length,
      text: hostname,
      severity: 'low',
      reason: `Uncommon top-level domain: ${tld}`,
      category: 'url quality',
    });
  }

  const brandPatterns = [
    /\bgoog[e1]?[e1]?\b/i, /\bfacebo[o0]?k\b/i, /\bpaypa[l1]?\b/i,
    /\bamazo[nn]?\b/i, /\bmicros[o0]ft\b/i, /\bapp[e1]?\b/i,
    /\bnetfl[i1]?x\b/i, /\bwhatsapp\b/i, /\binstagr[a4]m\b/i,
    /\btwitt[e1]?r\b/i, /\blinked[ij][1n]\b/i, /\byou[t]?ube\b/i,
  ];

  for (const pattern of brandPatterns) {
    if (pattern.test(hostname)) {
      spans.push({
        start: url.toLowerCase().indexOf(hostname),
        end: url.toLowerCase().indexOf(hostname) + hostname.length,
        text: hostname,
        severity: 'high',
        reason: 'Domain may impersonate a known brand',
        category: 'url quality',
      });
      break;
    }
  }

  const subdomainCount = hostname.split('.').length - 2;
  if (subdomainCount > 3) {
    spans.push({
      start: url.toLowerCase().indexOf(hostname),
      end: url.toLowerCase().indexOf(hostname) + hostname.length,
      text: hostname,
      severity: 'medium',
      reason: `Unusually many subdomains (${subdomainCount})`,
      category: 'url quality',
    });
  }

  const pathStart = cleanUrl.indexOf('/', cleanUrl.indexOf('://') + 3);
  let pathIdx = -1;
  if (pathStart !== -1) {
    const path = cleanUrl.slice(pathStart);
    pathIdx = cleanUrl.indexOf(path);
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length > 5) {
      spans.push({
        start: pathIdx, end: pathIdx + path.length,
        text: path.length > 40 ? path.slice(0, 40) + '...' : path,
        severity: 'low',
        reason: 'Long URL path with many segments',
        category: 'url quality',
      });
    }

    const specialChars = (path.match(/[^a-zA-Z0-9/\-_.~]/g) || []).length;
    if (specialChars > 5) {
      spans.push({
        start: pathIdx, end: pathIdx + path.length,
        text: path.length > 40 ? path.slice(0, 40) + '...' : path,
        severity: 'medium',
        reason: 'URL contains special characters',
        category: 'url quality',
      });
    }
  }

  const isTrusted = TRUSTED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  const isSuspicious = SUSPICIOUS_DOMAIN_KEYWORDS.some(d => hostname.includes(d));

  let score = 70;
  let details = '';

  if (isTrusted) {
    score = 95;
    details = 'Domain is from a known trusted source.';
  } else if (isSuspicious) {
    score = 20;
    details = 'Domain is associated with known questionable sources.';
  } else {
    if (spans.length > 0) {
      const highCount = spans.filter(s => s.severity === 'high').length;
      const medCount = spans.filter(s => s.severity === 'medium').length;
      score = Math.max(10, 70 - highCount * 20 - medCount * 10);
    }
    details = spans.length > 0
      ? `Found ${spans.length} suspicious URL characteristic${spans.length > 1 ? 's' : ''}.`
      : 'No obvious URL issues detected.';
  }

  return { score, details, spans };
}
