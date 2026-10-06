/**
 * PII minimization before sending content to AI providers.
 * Original feedback remains in the database; only sanitized text is sent to the model.
 */

const PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  { name: 'email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  {
    name: 'credit_card',
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    replacement: '[CARD]',
  },
  {
    name: 'phone',
    regex: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}\b/g,
    replacement: '[PHONE]',
  },
  {
    name: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN]',
  },
  {
    name: 'bearer_token',
    regex: /\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi,
    replacement: '[TOKEN]',
  },
  {
    name: 'api_key',
    regex: /\b(?:api[_-]?key|secret|token)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}['\"]?/gi,
    replacement: '[SECRET]',
  },
  {
    name: 'order_id',
    regex: /\b(?:order|invoice|txn|transaction)[#:\s-]*[A-Z0-9-]{6,}\b/gi,
    replacement: '[ORDER_ID]',
  },
  {
    name: 'account_id',
    regex: /\b(?:account|acct|user[_-]?id)[#:\s-]*[A-Z0-9-]{6,}\b/gi,
    replacement: '[ACCOUNT_ID]',
  },
  {
    name: 'uuid',
    regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    replacement: '[ID]',
  },
];

export interface SanitizeResult {
  sanitized: string;
  redactions: string[];
}

export function sanitizeForAi(text: string): SanitizeResult {
  let sanitized = text;
  const redactions = new Set<string>();

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(sanitized)) {
      redactions.add(pattern.name);
      // Reset lastIndex after test()
      pattern.regex.lastIndex = 0;
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
      pattern.regex.lastIndex = 0;
    }
  }

  // Collapse excessive whitespace from redactions
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  return { sanitized, redactions: Array.from(redactions) };
}
