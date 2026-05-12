/**
 * Type definitions shared between web and mobile
 */

export interface LeadData {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  message?: string;
  score?: 'High' | 'Medium' | 'Low';
  intent_summary?: string;
  category?: string;
  keyword_score?: string;
  source?: string;
}

export interface Visitor {
  visitor_id: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  lead_id?: number;
  conversation_stage: 'greeting' | 'needs_assessment' | 'contact_capture' | 'qualified' | 'handoff_requested';
  visit_count: number;
  first_visit_at: string;
  last_seen: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface ProgressInfo {
  stages: Array<{ key: string; label: string; icon: string }>;
  currentIndex: number;
  progress: number;
}

export interface LeadScoreInfo {
  score: 'High' | 'Medium' | 'Low';
  category: string;
  isHighValue: boolean;
}
