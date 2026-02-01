export type Industry = 'tech' | 'healthcare' | 'infrastructure' | 'custom' | string;

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type Priority = 'low' | 'medium' | 'high';

export interface AIAnalysis {
  sentiment: Sentiment;
  category: string;
  priority: Priority;
  summary: string;
}

export interface Feedback {
  id: string;
  productId: string;
  text: string;
  rating?: number;
  email?: string;
  createdAt: Date;
  analysis?: AIAnalysis;
  isAnalyzing?: boolean;
}

export interface ProductConfig {
  categories: string[];
  aiPrompt?: string;
  focusAreas?: string[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  industry: Industry;
  config?: ProductConfig;
  settings?: any; // To support API response
  createdAt?: Date; // API might not return this immediately in list
  created_at?: Date;
}

export interface InsightStats {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  highPriorityCount: number;
  averageRating: number;
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  Technology: 'Technology',
  Healthcare: 'Healthcare',
  Infrastructure: 'Infrastructure',
  Education: 'Education',
  Retail: 'Retail',
  Hospitality: 'Hospitality',
  Custom: 'Custom',
};

export const INDUSTRY_ICONS: Record<Industry, string> = {
  Technology: '💻',
  Healthcare: '🏥',
  Infrastructure: '🏗️',
  Education: '🎓',
  Retail: '🛒',
  Hospitality: '🏨',
  Custom: '⚙️',
};

export const DEFAULT_CATEGORIES: Record<Industry, string[]> = {
  tech: ['Bug Report', 'Performance', 'Feature Request', 'UI/UX', 'Documentation', 'Security'],
  healthcare: ['Staff Behavior', 'Wait Time', 'Facilities', 'Treatment Quality', 'Billing', 'Hygiene'],
  infrastructure: ['Safety Concerns', 'Project Delays', 'Quality Issues', 'Communication', 'Cost Overrun', 'Environmental'],
  custom: ['General', 'Suggestion', 'Complaint', 'Praise', 'Question'],
};

export const DEFAULT_AI_PROMPTS: Record<Industry, string> = {
  tech: 'Analyze feedback focusing on technical issues, software bugs, performance problems, and feature suggestions. Prioritize security and critical bugs.',
  healthcare: 'Analyze feedback focusing on patient experience, staff interactions, facility conditions, and treatment quality. Prioritize patient safety concerns.',
  infrastructure: 'Analyze feedback focusing on construction quality, safety compliance, project timelines, and environmental impact. Prioritize safety issues.',
  custom: 'Analyze feedback and categorize based on sentiment, urgency, and actionability. Focus on identifying actionable insights.',
};
