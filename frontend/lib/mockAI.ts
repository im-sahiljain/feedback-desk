import { AIAnalysis, Industry, Sentiment, Priority, DEFAULT_CATEGORIES } from '@/types';

interface KeywordMatch {
  keywords: string[];
  sentiment: Sentiment;
  priority: Priority;
  category: string;
}

const techKeywords: KeywordMatch[] = [
  { keywords: ['bug', 'crash', 'error', 'broken', 'fail', 'not working'], sentiment: 'negative', priority: 'high', category: 'Bug Report' },
  { keywords: ['slow', 'loading', 'performance', 'lag', 'freeze'], sentiment: 'negative', priority: 'high', category: 'Performance' },
  { keywords: ['security', 'vulnerability', 'hack', 'leak', 'password'], sentiment: 'negative', priority: 'high', category: 'Security' },
  { keywords: ['feature', 'add', 'would be great', 'wish', 'suggestion', 'integrate'], sentiment: 'neutral', priority: 'medium', category: 'Feature Request' },
  { keywords: ['ui', 'ux', 'design', 'interface', 'look', 'dark mode', 'theme'], sentiment: 'neutral', priority: 'low', category: 'UI/UX' },
  { keywords: ['documentation', 'docs', 'guide', 'tutorial', 'help'], sentiment: 'neutral', priority: 'low', category: 'Documentation' },
  { keywords: ['love', 'great', 'excellent', 'amazing', 'fantastic', 'awesome'], sentiment: 'positive', priority: 'low', category: 'UI/UX' },
];

const healthcareKeywords: KeywordMatch[] = [
  { keywords: ['wait', 'waiting', 'hours', 'delay', 'late'], sentiment: 'negative', priority: 'high', category: 'Wait Time' },
  { keywords: ['staff', 'nurse', 'doctor', 'rude', 'unprofessional', 'attentive'], sentiment: 'neutral', priority: 'medium', category: 'Staff Behavior' },
  { keywords: ['dirty', 'unclean', 'hygiene', 'smell', 'messy'], sentiment: 'negative', priority: 'medium', category: 'Hygiene' },
  { keywords: ['treatment', 'diagnosis', 'rushed', 'care', 'medical'], sentiment: 'neutral', priority: 'medium', category: 'Treatment Quality' },
  { keywords: ['billing', 'insurance', 'charge', 'payment', 'cost'], sentiment: 'neutral', priority: 'medium', category: 'Billing' },
  { keywords: ['facility', 'room', 'equipment', 'parking', 'booking'], sentiment: 'neutral', priority: 'low', category: 'Facilities' },
  { keywords: ['excellent', 'professional', 'caring', 'helpful', 'wonderful'], sentiment: 'positive', priority: 'low', category: 'Staff Behavior' },
];

const infrastructureKeywords: KeywordMatch[] = [
  { keywords: ['safety', 'dangerous', 'helmet', 'accident', 'injury', 'hazard'], sentiment: 'negative', priority: 'high', category: 'Safety Concerns' },
  { keywords: ['delay', 'behind', 'schedule', 'late', 'deadline'], sentiment: 'negative', priority: 'medium', category: 'Project Delays' },
  { keywords: ['quality', 'crack', 'defect', 'poor', 'workmanship'], sentiment: 'negative', priority: 'high', category: 'Quality Issues' },
  { keywords: ['noise', 'pollution', 'dust', 'environment', 'traffic'], sentiment: 'negative', priority: 'high', category: 'Environmental' },
  { keywords: ['cost', 'budget', 'expensive', 'overrun'], sentiment: 'negative', priority: 'medium', category: 'Cost Overrun' },
  { keywords: ['update', 'communication', 'inform', 'website'], sentiment: 'neutral', priority: 'low', category: 'Communication' },
  { keywords: ['great', 'fantastic', 'clean', 'professional', 'excellent'], sentiment: 'positive', priority: 'low', category: 'Quality Issues' },
];

const customKeywords: KeywordMatch[] = [
  { keywords: ['terrible', 'awful', 'worst', 'hate', 'disappointed'], sentiment: 'negative', priority: 'high', category: 'Complaint' },
  { keywords: ['suggest', 'idea', 'maybe', 'could', 'should'], sentiment: 'neutral', priority: 'medium', category: 'Suggestion' },
  { keywords: ['question', 'how', 'what', 'when', 'where', 'why'], sentiment: 'neutral', priority: 'low', category: 'Question' },
  { keywords: ['love', 'great', 'amazing', 'thank', 'appreciate'], sentiment: 'positive', priority: 'low', category: 'Praise' },
];

const keywordsByIndustry: Record<Industry, KeywordMatch[]> = {
  tech: techKeywords,
  healthcare: healthcareKeywords,
  infrastructure: infrastructureKeywords,
  custom: customKeywords,
};

function generateSummary(text: string, sentiment: Sentiment, category: string): string {
  const lowerText = text.toLowerCase();
  const wordCount = text.split(' ').length;
  
  const summaryTemplates = {
    negative: [
      `User reports ${category.toLowerCase()} issue requiring attention.`,
      `Critical ${category.toLowerCase()} concern raised by user.`,
      `Negative feedback regarding ${category.toLowerCase()} identified.`,
    ],
    neutral: [
      `User provides feedback on ${category.toLowerCase()}.`,
      `Suggestion received regarding ${category.toLowerCase()}.`,
      `Neutral observation about ${category.toLowerCase()} noted.`,
    ],
    positive: [
      `Positive feedback received for ${category.toLowerCase()}.`,
      `User expresses satisfaction with ${category.toLowerCase()}.`,
      `Favorable review highlighting ${category.toLowerCase()}.`,
    ],
  };

  const templates = summaryTemplates[sentiment];
  const index = wordCount % templates.length;
  return templates[index];
}

export async function analyzeTextWithMockAI(
  text: string,
  industry: Industry,
  customCategories?: string[]
): Promise<AIAnalysis> {
  // Simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  const lowerText = text.toLowerCase();
  const keywords = keywordsByIndustry[industry];
  const categories = customCategories || DEFAULT_CATEGORIES[industry];

  // Find matching keywords
  let bestMatch: KeywordMatch | null = null;
  let maxMatches = 0;

  for (const keywordMatch of keywords) {
    const matchCount = keywordMatch.keywords.filter(kw => lowerText.includes(kw)).length;
    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestMatch = keywordMatch;
    }
  }

  // Determine sentiment from text if no keyword match
  let sentiment: Sentiment = 'neutral';
  let priority: Priority = 'low';
  let category = categories[0] || 'General';

  if (bestMatch && maxMatches > 0) {
    sentiment = bestMatch.sentiment;
    priority = bestMatch.priority;
    category = categories.includes(bestMatch.category) ? bestMatch.category : categories[0];
  } else {
    // Fallback sentiment detection
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'happy', 'thanks', 'helpful'];
    const negativeWords = ['bad', 'poor', 'terrible', 'hate', 'awful', 'frustrated', 'angry', 'disappointed'];

    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    if (negativeCount > positiveCount) {
      sentiment = 'negative';
      priority = 'medium';
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive';
      priority = 'low';
    }

    // Assign random category if no match
    category = categories[Math.floor(Math.random() * categories.length)];
  }

  // Adjust priority based on text urgency
  const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'now'];
  if (urgentWords.some(w => lowerText.includes(w))) {
    priority = 'high';
  }

  const summary = generateSummary(text, sentiment, category);

  return {
    sentiment,
    category,
    priority,
    summary,
  };
}
