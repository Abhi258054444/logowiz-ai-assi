import { getEncoding } from 'js-tiktoken';
import { Message } from '../types';

// Initialize encoder once (cl100k_base is used by GPT-3.5/4)
const enc = getEncoding("cl100k_base");

export const countTokens = (systemPrompt: string, messages: Message[]): number => {
  let tokens = 0;

  try {
    // 1. System Prompt
    if (systemPrompt) {
      tokens += enc.encode(systemPrompt).length;
    }

    // 2. Chat History
    messages.forEach((msg) => {
      // Per-message overhead (approx 3 tokens for role/structure)
      tokens += 3;

      // Content tokens
      if (msg.content) {
        tokens += enc.encode(msg.content).length;
      }

      // Image attachment tokens (Vision)
      // Standard low-res detail estimate is ~85 tokens. 
      // High res is more, but for a general counter, 85 is a safe lower bound per image.
      if (msg.attachments && msg.attachments.length > 0) {
        tokens += (msg.attachments.length * 85);
      }
      
      // Generated image URL tokens (if any) are part of msg.content usually, 
      // but if we store them separately in structure we might count them here. 
      // Current implementation stores JSON in content, so it's covered above.
    });

    // 3. Reply prime (approx 3 tokens)
    tokens += 3;
    
  } catch (error) {
    console.error("Error calculating tokens:", error);
    return 0;
  }

  return tokens;
};