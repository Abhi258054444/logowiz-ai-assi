import { GoogleGenAI } from "@google/genai";
import { NetworkLogItem, Message, ServiceResponse, PollinationsResponse, UsageMetadata } from '../types';
import { SUMMARY_PROMPT } from '../constants';

// --- Prompt Optimizer (Existing) ---

export const generateOptimizationPromptTemplate = (
  currentSystemPrompt: string,
  logs: NetworkLogItem[],
  userIssue: string
): string => {
  // We take the last 5 logs to provide relevant recent context without overloading
  const recentLogs = logs.slice(-5).map(log => {
    // Create a copy of the request body to modify for display without affecting original logs
    let displayReq = { ...log.requestBody };

    // Optimize Gemini Request Body: Replace systemInstruction
    if (displayReq.systemInstruction) {
      displayReq.systemInstruction = "<<SYSTEM_PROMPT_REDACTED_SEE_CONTEXT_ABOVE>>";
    }

    // Optimize Pollinations/OpenAI Request Body: Replace system message content
    if (Array.isArray(displayReq.messages)) {
      displayReq.messages = displayReq.messages.map((msg: any) => {
        if (msg.role === 'system') {
          return { ...msg, content: "<<SYSTEM_PROMPT_REDACTED_SEE_CONTEXT_ABOVE>>" };
        }
        return msg;
      });
    }

    return `REQUEST:\n${JSON.stringify(displayReq, null, 2)}\n\nRESPONSE:\n${JSON.stringify(log.responseBody, null, 2)}`;
  }).join('\n\n--------------------------------------------------\n\n');

  return `
Role:-
You are Highly Skilled Prompt Engineer with years of Experince You Are Extreamly Good With making Ai Chatbot Agent
objective :-
i facing this issue in the prompt so improve it
User Issue Description: ${userIssue}
Context:-
in resource section you have request and response of the curent system.
Here is the Current Prompt Configuration that needs improvement:
${currentSystemPrompt}
Rule:-
-> this prompt already great so only thing changes that required to achive the objective
-> Prompt format must be same (Keep strictly to the output rules and structure defined in the original)
-> If You get any conflict in editing the prompt ask question
-> Strictly do not assume anything and ask before delete part of the prompt
-> prompt length must not exceed 4500 words
-> Also You need to list out what did you change add or delete

Resource:-
Below are the recent Request and Response logs from the system:
${recentLogs}
`;
};

// --- Gemini Chat API (New) ---

export const sendGeminiChatRequest = async (history: Message[], systemPrompt: string, modelName: string = 'gemini-3-flash-preview'): Promise<ServiceResponse> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Use passed model name or default
  const MODEL_NAME = modelName; 

  // Initialize Client
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Prepare Content with Strict Role Management
  // Gemini requires strict User -> Model -> User alternation.
  // It does NOT support 'system' role in contents (must use systemInstruction).
  
  // Filter out system messages (e.g. UI errors) from the history.
  const validHistory = history.filter(msg => msg.role === 'user' || msg.role === 'assistant');
  
  // Ensure conversation starts with 'user'
  // If the history starts with 'assistant' (e.g., initial welcome message), we skip it to satisfy API requirements.
  const startIndex = validHistory.findIndex(msg => msg.role === 'user');
  let adjustedHistory = startIndex >= 0 ? validHistory.slice(startIndex) : [];

  // 1.5 MERGE Consecutive Messages of same role
  // This is critical because if we inject a 'user' message as context (image url)
  // followed immediately by the actual user input 'user', Gemini API will error.
  const mergedHistory: Message[] = [];
  if (adjustedHistory.length > 0) {
    let currentMsg = { ...adjustedHistory[0] };
    
    for (let i = 1; i < adjustedHistory.length; i++) {
      const nextMsg = adjustedHistory[i];
      if (nextMsg.role === currentMsg.role) {
        // Merge contents
        currentMsg.content = (currentMsg.content || "") + "\n\n" + (nextMsg.content || "");
        
        // Merge attachments if any
        if (nextMsg.attachments) {
           currentMsg.attachments = [...(currentMsg.attachments || []), ...nextMsg.attachments];
        }
        
        // Merge base64 images if any
        if (nextMsg.base64Images) {
           currentMsg.base64Images = [...(currentMsg.base64Images || []), ...nextMsg.base64Images];
        }
      } else {
        mergedHistory.push(currentMsg);
        currentMsg = { ...nextMsg };
      }
    }
    mergedHistory.push(currentMsg);
  }
  
  const contents = mergedHistory.map((msg) => {
    const parts: any[] = [];
    
    // Add text content
    if (msg.content) {
      parts.push({ text: msg.content });
    }

    // Add URL context as raw text parts (Requested Format for Editing/Reference)
    // The model uses this string to populate the "image_input" field in the JSON response
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(url => {
         parts.push({ text: url });
      });
    }

    // Add Base64 Image Data (for Vision Analysis)
    // The model uses this inline data to "see" the image content
    if (msg.base64Images && msg.base64Images.length > 0) {
      msg.base64Images.forEach(base64Str => {
         // data:image/png;base64,.....
         const matches = base64Str.match(/^data:([^;]+);base64,(.+)$/);
         if (matches) {
           parts.push({
             inlineData: {
               mimeType: matches[1],
               data: matches[2]
             }
           });
         }
      });
    }

    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: parts
    };
  });

  // Add system instruction via config (Proper System Structure for Gemini)
  const config: any = {
    systemInstruction: systemPrompt,
  };

  if (MODEL_NAME === 'gemini-3.1-pro-preview') {
    config.tools = [{ googleSearch: {} }];
  } else {
    config.responseMimeType = "application/json";
  }

  let responseStatus = 0;
  let responseBody: any = null;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: config
    });

    responseStatus = 200; // SDK doesn't give raw status easily, assume success if no throw
    
    // Standard text response path
    const textOutput = response.text || "";
    
    // Attempt to clean JSON string if it comes wrapped in markdown or contains raw newlines
    const cleanedOutput = cleanJsonString(textOutput);
    
    // Parse JSON
    let parsed: PollinationsResponse;
    try {
      parsed = JSON.parse(cleanedOutput);
    } catch (e) {
      console.warn("Gemini output was not valid JSON, attempting to wrap", textOutput);
      parsed = { response_msg: textOutput };
    }
    
    // Extract grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      const sources = chunks.map((chunk: any) => chunk.web?.uri).filter(Boolean);
      if (sources.length > 0 && parsed.response_msg) {
        const uniqueSources = Array.from(new Set(sources));
        parsed.response_msg += "\n\n**Sources:**\n" + uniqueSources.map((uri: any) => `- [${uri}](${uri})`).join("\n");
      }
    }

    responseBody = parsed;

    const endTime = Date.now();
    
    // Detailed logging for debug panel
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
      method: 'SDK',
      requestHeaders: { 'Authorization': 'HIDDEN' },
      requestBody: { 
        model: MODEL_NAME, 
        systemInstruction: config.systemInstruction,
        // We log the contents but truncate large base64 strings for readability in logs
        contents: contents.map(c => ({
          ...c,
          parts: c.parts.map((p: any) => p.inlineData ? { inlineData: { mimeType: p.inlineData.mimeType, data: '[BASE64_IMAGE_DATA]' } } : p)
        }))
      },
      responseStatus,
      responseBody: parsed,
      duration: endTime - startTime
    };

    const usage = response.usageMetadata ? {
      promptTokenCount: response.usageMetadata.promptTokenCount || 0,
      candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
      totalTokenCount: response.usageMetadata.totalTokenCount || 0
    } : undefined;

    return { data: parsed, debug, usage };

  } catch (error: any) {
    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`,
      method: 'SDK',
      requestHeaders: {},
      requestBody: { 
        model: MODEL_NAME,
        systemInstruction: config.systemInstruction,
        contents: contents.map(c => ({
          ...c,
          parts: c.parts.map((p: any) => p.inlineData ? { inlineData: { mimeType: p.inlineData.mimeType, data: '[BASE64_IMAGE_DATA]' } } : p)
        }))
      },
      responseStatus: 500,
      responseBody: { error: error.message },
      duration: endTime - startTime
    };
    
    console.error("Gemini Request Failed:", error);
    const enhancedError: any = new Error(error.message);
    enhancedError.debug = debug;
    throw enhancedError;
  }
};

export const enhanceImagePromptGemini = async (
  originalPrompt: string, 
  enhancerSystemPrompt: string, 
  toolCode: number = 1,
  imageInput?: string,
  modelName: string = 'gemini-3.1-flash-lite-preview'
): Promise<{ enhancedPrompt: string, debug: NetworkLogItem, usage?: UsageMetadata }> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const inputPayload: any = {
    prompt: originalPrompt,
    tool_code: toolCode
  };
  
  if (imageInput) {
    inputPayload.image_input = [imageInput];
  }

  const agentInput = JSON.stringify(inputPayload);

  const parts: any[] = [{ text: agentInput }];

  if (imageInput) {
    // If we have an image URL, we pass it as text context for Gemini
    // (If it was a base64 string, we'd use inlineData, but it's a URL here)
    parts.push({ text: imageInput });
  }

  const config = {
    systemInstruction: enhancerSystemPrompt,
    responseMimeType: "application/json",
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts }],
      config: config
    });

    const textOutput = response.text || "";
    const cleanedOutput = cleanJsonString(textOutput);
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedOutput);
    } catch (e) {
      console.warn("Gemini Enhancer output not JSON", textOutput);
      parsed = { prompt: originalPrompt }; 
    }

    const enhancedPrompt = parsed.prompt || originalPrompt;

    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent (Enhancer - Tool ${toolCode})`,
      method: 'SDK',
      requestHeaders: { 'Authorization': 'HIDDEN' },
      requestBody: { 
        model: modelName, 
        systemInstruction: config.systemInstruction,
        contents: [{ role: 'user', parts }]
      },
      responseStatus: 200,
      responseBody: parsed,
      duration: endTime - startTime
    };

    const usage = response.usageMetadata ? {
      promptTokenCount: response.usageMetadata.promptTokenCount || 0,
      candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
      totalTokenCount: response.usageMetadata.totalTokenCount || 0
    } : undefined;

    return { enhancedPrompt, debug, usage };

  } catch (error: any) {
    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent (Enhancer - Tool ${toolCode})`,
      method: 'SDK',
      requestHeaders: {},
      requestBody: { 
        model: modelName,
        systemInstruction: config.systemInstruction,
        contents: [{ role: 'user', parts }]
      },
      responseStatus: 500,
      responseBody: { error: error.message },
      duration: endTime - startTime
    };
    
    console.error("Gemini Prompt Enhancement Failed", error);
    return { enhancedPrompt: originalPrompt, debug };
  }
};

const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  
  // Aggressively remove any markdown code block wrappers if they exist
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

  // Find the first { and the last } to extract the JSON object, ignoring any conversational filler
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // Fix for Concatenated JSONs (e.g. {...}{...})
  // Sometimes the model or merged history creates adjacent JSON blocks.
  // We strictly look for the first valid closing brace matching the first opening brace.
  if (cleaned.startsWith('{')) {
      // Simple heuristic: If we see "}{", just take the first part
      // This is robust enough for the "Tool JSON + Response JSON" error scenario
      const splitIndex = cleaned.indexOf('}{');
      if (splitIndex !== -1) {
          cleaned = cleaned.substring(0, splitIndex + 1);
      }
  }
  
  // Heuristic to fix unescaped newlines within JSON strings
  // This targets "response_msg", "prompt", etc. to replace raw newlines with \n
  cleaned = cleaned.replace(/("[a-zA-Z0-9_]+"\s*:\s*")((?:[^"\\]|\\.|[\r\n])*)(")/g, (match, p1, p2, p3) => {
    // Replace raw newlines with escaped newlines inside the string value
    const fixedContent = p2.replace(/\n/g, '\\n').replace(/\r/g, '');
    return `${p1}${fixedContent}${p3}`;
  });

  return cleaned.trim();
};

export const summarizeChatHistory = async (history: Message[], modelName: string = 'gemini-2.5-flash'): Promise<{ summary: string, debug: NetworkLogItem, usage?: UsageMetadata }> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Format history into a single text block
  const historyText = history.map(msg => {
    let text = `[${msg.role.toUpperCase()}]: ${msg.content || msg.displayContent}`;
    if (msg.attachments && msg.attachments.length > 0) {
      text += `\\n[Attached Images: ${msg.attachments.length}]`;
    }
    return text;
  }).join('\\n\\n');

  const contents = [{ role: 'user', parts: [{ text: historyText }] }];

  const config = {
    systemInstruction: SUMMARY_PROMPT,
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: config
    });

    const summary = response.text || "Summary failed.";
    const endTime = Date.now();
    
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent (Summarizer)`,
      method: 'SDK',
      requestHeaders: { 'Authorization': 'HIDDEN' },
      requestBody: { 
        model: modelName, 
        systemInstruction: config.systemInstruction,
        contents: contents
      },
      responseStatus: 200,
      responseBody: { summary },
      duration: endTime - startTime
    };

    const usage = response.usageMetadata ? {
      promptTokenCount: response.usageMetadata.promptTokenCount || 0,
      candidatesTokenCount: response.usageMetadata.candidatesTokenCount || 0,
      totalTokenCount: response.usageMetadata.totalTokenCount || 0
    } : undefined;

    return { summary, debug, usage };
  } catch (error: any) {
    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent (Summarizer)`,
      method: 'SDK',
      requestHeaders: {},
      requestBody: { 
        model: modelName,
        systemInstruction: config.systemInstruction,
        contents: contents
      },
      responseStatus: 500,
      responseBody: { error: error.message },
      duration: endTime - startTime
    };
    console.error("Gemini Summarization Failed:", error);
    return { summary: "Failed to summarize context.", debug };
  }
};