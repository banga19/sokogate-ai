/**
 * Lead Scoring Engine
 * Analyzes text to assign intent scores based on keyword patterns.
 * Used as a secondary scoring mechanism alongside AI-generated scores.
 */

export type Score = 'High' | 'Medium' | 'Low';

const HIGH_INTENT_KEYWORDS = [
  'bulk',
  'wholesale',
  'urgent',
  'asap',
  'immediate',
  'ready to buy',
  'ready to sell',
  'purchase order',
  'po',
  'invoice',
  'ship now',
  'large quantity',
  'order now',
  'need now',
  'stock up',
  'import',
  'export',
  'container',
  'contract',
  'minimum order',
  'moq',
  'immediate need',
  'quick delivery',
  'fast shipping',
  'samples approved',
  'proceed',
  'buy now',
  'sell now',
  'deal',
];

const MEDIUM_INTENT_KEYWORDS = [
  'interested',
  'quote',
  'quotation',
  'price',
  'pricing',
  'catalog',
  'catalogue',
  'samples',
  'sample',
  'more info',
  'details',
  'information',
  'specifications',
  'specs',
  'lead time',
  'delivery time',
  'payment terms',
  'terms',
  'conditions',
  'negotiate',
  'discount',
  'offer',
  'proposal',
  'contact us',
  'call me',
  'email me',
];

const LOW_INTENT_KEYWORDS = [
  'just looking',
  'maybe',
  'considering',
  'research',
  'compare',
  'comparison',
  'thinking',
  'not sure',
  'exploring',
  'browsing',
  'window shopping',
  'future',
  'someday',
  'maybe later',
  'not ready',
  'planning',
  'budgeting',
  'learning',
  'understanding',
];

/**
 * Calculates an intent score from a text string.
 * Returns 'High', 'Medium', or 'Low' based on weighted keyword matches.
 */
export function scoreLeadFromText(text: string): Score {
  if (!text) return 'Low';

  const lower = text.toLowerCase();

  // Count keyword occurrences
  const count = (words: string[]): number => {
    let count = 0;
    for (const word of words) {
      if (lower.includes(word)) count++;
    }
    return count;
  };

   let highCount = count(HIGH_INTENT_KEYWORDS);
   let mediumCount = count(MEDIUM_INTENT_KEYWORDS);
   let lowCount = count(LOW_INTENT_KEYWORDS);

  // Quantity detection: numbers >= 1000 often indicate high intent
  const quantityMatch = lower.match(/(\d+)\s*(?:units|pcs|pieces|items|quantity|kilos|tons|boxes|cartons)/i);
  if (quantityMatch) {
    const qty = parseInt(quantityMatch[1], 10);
    if (qty >= 1000) {
      highCount += 2;
    } else if (qty >= 100) {
      mediumCount += 1;
    }
  }

  // Urgency detection
  const urgencyWords = ['today', 'this week', 'next week', 'immediately', 'right now'];
  if (urgencyWords.some(w => lower.includes(w))) {
    highCount += 1;
  }

  // Determine final score based on highest weighted count
  if (highCount > 0) return 'High';
  if (mediumCount > 0) return 'Medium';
  return 'Low';
}
