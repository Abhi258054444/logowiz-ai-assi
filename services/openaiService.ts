import { NetworkLogItem, Message, ServiceResponse, PollinationsResponse } from '../types';

export const sendOpenAiChatRequest = async (
  history: Message[], 
  systemPrompt: string, 
  apiKey?: string,
  modelName: string = 'gpt-5-mini'
): Promise<ServiceResponse> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  const effectiveApiKey = apiKey || process.env.OPENAI_API_KEY || process.env.API_KEY || '';

  if (!effectiveApiKey) {
    throw new Error("OpenAI API Key is required. Please set it in Settings or .env file.");
  }

  // Filter out system messages from history
  const validHistory = history.filter(msg => msg.role === 'user' || msg.role === 'assistant');
  
  const messages: any[] = [
    { role: 'system', content: systemPrompt }
  ];

  validHistory.forEach(msg => {
    const contentParts: any[] = [];
    
    if (msg.content) {
      contentParts.push({ type: "text", text: msg.content });
    }

    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(url => {
        contentParts.push({ type: "image_url", image_url: { url } });
      });
    }

    if (msg.base64Images && msg.base64Images.length > 0) {
      msg.base64Images.forEach(base64Str => {
        contentParts.push({ type: "image_url", image_url: { url: base64Str } });
      });
    }

    messages.push({
      role: msg.role,
      content: contentParts.length === 1 && contentParts[0].type === 'text' ? contentParts[0].text : contentParts
    });
  });

  const requestBody = {
    model: modelName,
    messages: messages,
    response_format: { type: "json_object" }
  };

  let responseStatus = 0;
  let responseBody: any = null;

  try {
    // Add 40-second delay to prevent OpenAI rate limits
    await new Promise(resolve => setTimeout(resolve, 40000));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': effectiveApiKey.startsWith('Bearer ') ? effectiveApiKey : `Bearer ${effectiveApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    responseStatus = response.status;
    const data = await response.json();
    responseBody = data;

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API request failed");
    }

    const textOutput = data.choices[0].message.content || "";
    const cleanedOutput = cleanJsonString(textOutput);
    
    let parsed: PollinationsResponse;
    try {
      parsed = JSON.parse(cleanedOutput);
    } catch (e) {
      console.warn("OpenAI output was not valid JSON", textOutput);
      parsed = { response_msg: textOutput };
    }

    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://api.openai.com/v1/chat/completions`,
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer [HIDDEN]' },
      requestBody: {
        ...requestBody,
        messages: messages.map(m => ({
          ...m,
          content: Array.isArray(m.content) ? m.content.map((c: any) => c.type === 'image_url' ? { type: 'image_url', image_url: { url: '[IMAGE_DATA]' } } : c) : m.content
        }))
      },
      responseStatus,
      responseBody: parsed,
      duration: endTime - startTime
    };

    return { data: parsed, debug };

  } catch (error: any) {
    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://api.openai.com/v1/chat/completions`,
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer [HIDDEN]' },
      requestBody: {
        ...requestBody,
        messages: messages.map(m => ({
          ...m,
          content: Array.isArray(m.content) ? m.content.map((c: any) => c.type === 'image_url' ? { type: 'image_url', image_url: { url: '[IMAGE_DATA]' } } : c) : m.content
        }))
      },
      responseStatus: responseStatus || 500,
      responseBody: { error: error.message },
      duration: endTime - startTime
    };
    
    console.error("OpenAI Request Failed:", error);
    const enhancedError: any = new Error(error.message);
    enhancedError.debug = debug;
    throw enhancedError;
  }
};

export const enhanceImagePromptOpenAi = async (
  originalPrompt: string, 
  enhancerSystemPrompt: string, 
  toolCode: number = 1,
  imageInput?: string,
  apiKey?: string,
  modelName: string = 'gpt-5-mini'
): Promise<{ enhancedPrompt: string, debug: NetworkLogItem }> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  const effectiveApiKey = apiKey || process.env.OPENAI_API_KEY || process.env.API_KEY || '';

  if (!effectiveApiKey) {
    console.warn("OpenAI API Key is missing for enhancer, using original prompt.");
    return { enhancedPrompt: originalPrompt, debug: {
      id: requestId, timestamp: startTime, url: 'local', method: 'skip', requestHeaders: {}, requestBody: {}, responseStatus: 200, responseBody: {}, duration: 0
    } };
  }

  const inputPayload: any = {
    prompt: originalPrompt,
    tool_code: toolCode
  };
  
  if (imageInput) {
    inputPayload.image_input = [imageInput];
  }

  const agentInput = JSON.stringify(inputPayload);

  const messages: any[] = [
    { role: 'system', content: enhancerSystemPrompt }
  ];

  if (imageInput) {
    messages.push({
      role: 'user',
      content: [
        { type: "text", text: agentInput },
        { type: "image_url", image_url: { url: imageInput } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: agentInput });
  }

  const requestBody = {
    model: modelName,
    messages: messages,
    response_format: { type: "json_object" }
  };

  try {
    // Add 40-second delay to prevent OpenAI rate limits
    await new Promise(resolve => setTimeout(resolve, 40000));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': effectiveApiKey.startsWith('Bearer ') ? effectiveApiKey : `Bearer ${effectiveApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API request failed");
    }

    const textOutput = data.choices[0].message.content || "";
    const cleanedOutput = cleanJsonString(textOutput);
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedOutput);
    } catch (e) {
      console.warn("OpenAI Enhancer output not JSON", textOutput);
      parsed = { prompt: originalPrompt }; 
    }

    const enhancedPrompt = parsed.prompt || originalPrompt;

    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://api.openai.com/v1/chat/completions (Enhancer - Tool ${toolCode})`,
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer [HIDDEN]' },
      requestBody: {
        ...requestBody,
        messages: messages.map(m => ({
          ...m,
          content: Array.isArray(m.content) ? m.content.map((c: any) => c.type === 'image_url' ? { type: 'image_url', image_url: { url: '[IMAGE_DATA]' } } : c) : m.content
        }))
      },
      responseStatus: response.status,
      responseBody: parsed,
      duration: endTime - startTime
    };

    return { enhancedPrompt, debug };

  } catch (error: any) {
    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `https://api.openai.com/v1/chat/completions (Enhancer - Tool ${toolCode})`,
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer [HIDDEN]' },
      requestBody: {
        ...requestBody,
        messages: messages.map(m => ({
          ...m,
          content: Array.isArray(m.content) ? m.content.map((c: any) => c.type === 'image_url' ? { type: 'image_url', image_url: { url: '[IMAGE_DATA]' } } : c) : m.content
        }))
      },
      responseStatus: 500,
      responseBody: { error: error.message },
      duration: endTime - startTime
    };
    
    console.error("OpenAI Prompt Enhancement Failed", error);
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
  
  if (cleaned.startsWith('{')) {
      const splitIndex = cleaned.indexOf('}{');
      if (splitIndex !== -1) {
          cleaned = cleaned.substring(0, splitIndex + 1);
      }
  }
  
  cleaned = cleaned.replace(/("[a-zA-Z0-9_]+"\s*:\s*")((?:[^"\\]|\\.|[\r\n])*)(")/g, (match, p1, p2, p3) => {
    const fixedContent = p2.replace(/\n/g, '\\n').replace(/\r/g, '');
    return `${p1}${fixedContent}${p3}`;
  });

  return cleaned.trim();
};
