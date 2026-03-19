
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string; // The raw content for API history
  
  // Parsed fields for UI
  displayContent?: string; // What we show to the user (response_msg)
  type?: 'text' | 'image' | 'error';
  imageUrl?: string; // For Assistant generated images
  attachments?: string[]; // For User uploaded images (URLs)
  base64Images?: string[]; // For Gemini Vision (Raw Base64)
  isGenerating?: boolean;
  isHidden?: boolean; // If true, message is sent to API but hidden from UI
}

export interface PollinationsResponse {
  response_msg?: string;
  prompt?: string;
  tool_code?: number;
  image_input?: string[];
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

export interface ServiceResponse {
  data: PollinationsResponse;
  debug: NetworkLogItem;
}

export interface PromptVersion {
  id?: number;
  content: string;
  timestamp: number;
  note: string; // e.g., "Initial Save", "Optimized by Gemini", "Restored Version"
  source: 'user' | 'ai' | 'system';
  promptType?: 'system' | 'enhancer' | 'editor-enhancer'; // New field to distinguish prompt types
}

export type ModelMode = 'pollinations' | 'gemini' | 'gemini-lite' | 'gemini-pro' | 'openai' | 'gemini-2.5-pro';
export type ImageModelMode = 'pollinations' | 'together-seedream';