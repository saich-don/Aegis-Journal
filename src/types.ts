export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ActionItem {
  id: string;
  task: string;
  category: 'Personal' | 'Work' | 'Wellness' | 'Mindset';
  completed: boolean;
  sourceEntryId?: string;
  sourceEntryTitle?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary: string;
  keyTakeaways: string[];
  moodTags: string[];
  sentimentScore: number; // range -1.0 to 1.0
  sentimentLabel: 'Positive' | 'Neutral' | 'Reflective' | 'Constructive' | 'Challenging';
  actionItems: ActionItem[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type ActiveTab = 'chat' | 'entries' | 'analytics';

export interface SummarizeResponse {
  title: string;
  summary: string;
  keyTakeaways: string[];
  moodTags: string[];
  sentimentScore: number;
  sentimentLabel: 'Positive' | 'Neutral' | 'Reflective' | 'Constructive' | 'Challenging';
  actionItems: Array<{
    id: string;
    task: string;
    category: 'Personal' | 'Work' | 'Wellness' | 'Mindset';
    completed: boolean;
  }>;
}

export interface MemoryCitation {
  entryId: string;
  title: string;
  date: string;
  excerptOrRelevance: string;
}

export interface MemoryQueryResult {
  answer: string;
  citations: MemoryCitation[];
  keyThemes: string[];
  coachingInsight: string;
}

export interface WeeklyCognitiveDigest {
  headline: string;
  executiveSummary: string;
  emotionalTrajectory: string;
  topStressorsAndBreakthroughs: Array<{
    stressor: string;
    breakthroughOrLesson: string;
  }>;
  celebratedWins: string[];
  actionItemsAudit: {
    total: number;
    completed: number;
    resolutionRate: string;
    recommendations: string;
  };
  growthCoachingDirectives: string[];
  generatedAt: number;
}
