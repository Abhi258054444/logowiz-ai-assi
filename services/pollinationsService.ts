import { API_ENDPOINT, API_KEY, DEFAULT_ENHANCER_PROMPT } from '../constants';
import { Message, PollinationsResponse, ServiceResponse, NetworkLogItem } from '../types';
import { uploadImage } from './uploadService';

export const sendChatRequest = async (history: Message[], systemPrompt: string, modelName: string = 'gemini-fast'): Promise<ServiceResponse> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Filter messages to send only role and content properties
  // Construct OpenAI Vision compatible format if attachments exist
  const messagesToSend = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => {
      // If message has attachments, format it as an array of content parts
      if (msg.attachments && msg.attachments.length > 0) {
        // Crucial: We must append the URLs to the text content as well so the model can
        // copy them into the JSON response for "Editing" (tool_code: 2).
        // Without this, the model sees the image but might not know the URL string to output.
        const textContent = (msg.content || "") + "\n\n[System: Attached Images available for editing/reference:]\n" + msg.attachments.join('\n');

        return {
          role: msg.role,
          content: [
            { type: "text", text: textContent }, 
            ...msg.attachments.map(url => ({
              type: "image_url",
              image_url: {
                url: url // URL provided by upload service
              }
            }))
          ]
        };
      }
      
      // Default text-only message
      return { role: msg.role, content: msg.content };
    })
  ];

  // Request body matching standard OpenAI format
  const requestBody = {
    model: modelName, 
    messages: messagesToSend,
    stream: false,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    frequency_penalty: 0,
    max_tokens: 4096 // Ensure we have a generous token limit
  };

  const requestHeaders = {
    'Content-Type': 'application/json',
    'Authorization': API_KEY
  };

  let responseStatus = 0;
  let responseBody: any = null;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    responseStatus = response.status;
    
    // Try to parse JSON regardless of status to get error details
    const data = await response.json().catch(() => null);
    responseBody = data;

    if (!response.ok) {
      // Extract detailed error message if available
      const errorMsg = data?.error?.message || JSON.stringify(data?.error) || response.statusText;
      throw new Error(`API Error: ${response.status} - ${errorMsg}`);
    }

    // Check choices array which is standard OpenAI format
    const rawContent = data?.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content received from AI");
    }

    // Attempt to clean JSON string if it comes wrapped in markdown or contains raw newlines
    const cleanedContent = cleanJsonString(rawContent);

    let parsed: PollinationsResponse;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse JSON:", rawContent);
      // Fallback: If it's not JSON, treat it as a regular message
      parsed = { response_msg: rawContent };
    }

    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: API_ENDPOINT,
      method: 'POST',
      requestHeaders,
      requestBody,
      responseStatus,
      responseBody,
      duration: endTime - startTime
    };

    return { data: parsed, debug };

  } catch (error: any) {
    // Capture error in debug log even if it fails
    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: API_ENDPOINT,
      method: 'POST',
      requestHeaders,
      requestBody,
      responseStatus: responseStatus || 0,
      responseBody: responseBody || { error: error.message },
      duration: endTime - startTime
    };

    console.error("Chat Request failed:", error);
    const enhancedError: any = new Error(error.message);
    enhancedError.debug = debug;
    throw enhancedError;
  }
};

export const enhanceImagePrompt = async (
  originalPrompt: string, 
  enhancerSystemPrompt: string = DEFAULT_ENHANCER_PROMPT, 
  toolCode: number = 1,
  imageInput?: string,
  modelName: string = 'gemini-fast'
): Promise<{ enhancedPrompt: string, debug: NetworkLogItem }> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Input for the enhancer agent
  const inputPayload: any = {
    prompt: originalPrompt,
    tool_code: toolCode
  };
  
  if (imageInput) {
    inputPayload.image_input = [imageInput];
  }

  const agentInput = JSON.stringify(inputPayload);

  // Construct messages with vision support if image provided
  const messages: any[] = [
      { role: 'system', content: enhancerSystemPrompt }
  ];

  if (imageInput) {
      messages.push({
          role: 'user',
          content: [
              { type: "text", text: agentInput },
              { 
                type: "image_url", 
                image_url: { url: imageInput } 
              }
          ]
      });
  } else {
      messages.push({ role: 'user', content: agentInput });
  }

  const requestBody = {
    model: modelName,
    messages: messages,
    temperature: 0.7,
    max_tokens: 4096,
    stream: false
  };

  const requestHeaders = {
    'Content-Type': 'application/json',
    'Authorization': API_KEY
  };

  let responseStatus = 0;
  let responseBody: any = null;

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    responseStatus = response.status;
    const data = await response.json().catch(() => null);
    responseBody = data;

    if (!response.ok) {
      throw new Error(`Enhancer API Error: ${response.status}`);
    }

    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("No content from enhancer");

    const cleanedContent = cleanJsonString(rawContent);
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      console.warn("Enhancer output not JSON", rawContent);
      // Fallback: If not JSON, assume the text is the prompt if it looks like one, or keep original
      parsed = { prompt: originalPrompt }; 
    }

    const enhancedPrompt = parsed.prompt || originalPrompt;

    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `${API_ENDPOINT} (Enhancer - Tool ${toolCode})`,
      method: 'POST',
      requestHeaders,
      requestBody,
      responseStatus,
      responseBody,
      duration: endTime - startTime
    };

    return { enhancedPrompt, debug };

  } catch (error: any) {
    const endTime = Date.now();
    const debug: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: `${API_ENDPOINT} (Enhancer - Tool ${toolCode})`,
      method: 'POST',
      requestHeaders,
      requestBody,
      responseStatus: responseStatus || 0,
      responseBody: responseBody || { error: error.message },
      duration: endTime - startTime
    };
    
    // Return original prompt if enhancement fails, but log error
    console.error("Prompt Enhancement Failed", error);
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
  // Heuristic to fix unescaped newlines within JSON strings
  // This targets "response_msg", "prompt", etc. to replace raw newlines with \n
  cleaned = cleaned.replace(/("[a-zA-Z0-9_]+"\s*:\s*")((?:[^"\\]|\\.|[\r\n])*)(")/g, (match, p1, p2, p3) => {
    // Replace raw newlines with escaped newlines inside the string value
    const fixedContent = p2.replace(/\n/g, '\\n').replace(/\r/g, '');
    return `${p1}${fixedContent}${p3}`;
  });

  return cleaned.trim();
};

export const generateImage = async (prompt: string, imageInput?: string, modelName: string = 'flux-2-dev', width: number = 768, height: number = 1152): Promise<{ base64: string, url: string, debug: NetworkLogItem }> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Ensure the prompt is safe for URLs
  const encodedPrompt = encodeURIComponent(prompt);
  // Add seed for randomness and specific params for quality
  const seed = Math.floor(Math.random() * 10000);
  
  // Use gen.pollinations.ai/image endpoint as requested
  let url = `https://gen.pollinations.ai/image/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${modelName}`;
  
  if (imageInput) {
    // If imageInput exists, add it as a query parameter
    url += `&image=${encodeURIComponent(imageInput)}`;
  }
  
  let debugLog: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: url,
      method: 'GET',
      requestHeaders: { 'Authorization': 'Bearer [HIDDEN]' },
      requestBody: { type: imageInput ? 'Image Editing' : 'Image Generation', prompt, image_input: imageInput, model: modelName },
      responseStatus: 0,
      responseBody: null,
      duration: 0
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': API_KEY
      }
    });

    if (!response.ok) {
      // Try to read text or JSON error from body
      const errorText = await response.text();
      let errorBody = errorText;
      try {
          errorBody = JSON.parse(errorText);
      } catch (e) { /* ignore */ }

      debugLog.responseStatus = response.status;
      debugLog.responseBody = errorBody;
      debugLog.duration = Date.now() - startTime;

      const error: any = new Error(`Image Generation Failed: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.url = url;
      error.responseBody = errorBody;
      error.debug = debugLog;
      throw error;
    }

    const blob = await response.blob();
    
    // Convert Blob to Base64 for immediate local display
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Upload to public server to ensure long-term accessibility and bypass auth restrictions
    let publicUrl = base64;
    try {
      const file = new File([blob], `generated-${seed}.png`, { type: 'image/png' });
      publicUrl = await uploadImage(file);
    } catch (uploadError) {
      console.warn("Failed to upload image to public storage, falling back to base64", uploadError);
    }

    debugLog.responseStatus = 200;
    debugLog.responseBody = { status: "Success", contentType: "image/blob", size: base64.length };
    debugLog.duration = Date.now() - startTime;

    return { base64, url: publicUrl, debug: debugLog };
  } catch (error: any) {
    // Ensure URL and status are attached to the error object for downstream logging
    if (!error.url) error.url = url;
    if (!error.status) error.status = 0; // 0 usually means network error
    if (!error.responseBody) error.responseBody = { error: error.message };
    
    debugLog.duration = Date.now() - startTime;
    debugLog.responseBody = debugLog.responseBody || error.responseBody;
    error.debug = debugLog;
    
    throw error;
  }
};