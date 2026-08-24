
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string; // The raw content for API history
  
  // Parsed fields for UI
  displayContent?: string; // What we show to the user (response_msg)
  type?: 'text' | 'image' | 'error' | 'questions';
  imageUrl?: string; // For Assistant generated images
  attachments?: string[]; // For User uploaded images (URLs)
  base64Images?: string[]; // For Gemini Vision (Raw Base64)
  isGenerating?: boolean;
  isHidden?: boolean; // If true, message is sent to API but hidden from UI
  questionData?: FlyerQuestionToolCall; // For function call question cards
  isQuestionAnswered?: boolean; // If true, question cards are disabled (already answered/skipped)
}

export interface PollinationsResponse {
  response_msg?: string;
  prompt?: string;
  tool_code?: number;
  image_input?: string[];
  usage?: UsageMetadata;
  round?: number;
  total_questions?: number;
  questions?: FlyerQuestion[];
  context_summary?: string;
}

export interface FlyerQuestionOption {
  id: string;
  label: string;
}

export interface FlyerQuestion {
  id: string;
  question: string;
  type: 'single_select' | 'multi_select' | 'short_answer' | 'image_upload';
  why_asking?: string;
  required?: boolean;
  allow_other?: boolean;
  other_placeholder?: string;
  min_select?: number;
  max_select?: number;
  placeholder?: string;
  options?: FlyerQuestionOption[];
  category?: 'event_details' | 'design_style' | 'content_text' | 'branding' | 'other';
}

export interface FlyerQuestionToolCall {
  round?: number;
  total_questions?: number;
  questions: FlyerQuestion[];
  context_summary?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface NetworkLogItem {
  id: string;
  timestamp: number;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
  duration: number; // in ms
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface ServiceResponse {
  data: PollinationsResponse;
  debug: NetworkLogItem;
  usage?: UsageMetadata;
}

export interface PromptVersion {
  id?: number;
  content: string;
  timestamp: number;
  note: string; // e.g., "Initial Save", "Optimized by Gemini", "Restored Version"
  source: 'user' | 'ai' | 'system';
  promptType?: 'system' | 'enhancer' | 'editor-enhancer'; // New field to distinguish prompt types
}

export type ModelMode = 'pollinations' | 'openai' | 'gpt-5-mini' | 'gpt-5-nano' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini' | 'gemini-lite' | 'gemini-pro';
export type ImageModelMode = 'pollinations' | 'together-seedream' | 'gpt-image';