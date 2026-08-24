import { NetworkLogItem } from '../types';
import { uploadImage } from './uploadService';

const TOGETHER_GEN_URL = 'https://api.together.xyz/v1/images/generations';

export const generateImageTogether = async (prompt: string, apiKey: string, width: number = 768, height: number = 1152): Promise<{ base64: string, url: string, debug: NetworkLogItem }> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  const requestPayload = { 
      model: "ByteDance-Seed/Seedream-4.0",
      prompt, 
      width,
      height,
      n: 1,
      response_format: "b64_json"
  };

  let debugLog: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: TOGETHER_GEN_URL,
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer [HIDDEN]' },
      requestBody: requestPayload,
      responseStatus: 0,
      responseBody: null,
      duration: 0
  };

  try {
    const submitResponse = await fetch(TOGETHER_GEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!submitResponse.ok) {
       const errText = await submitResponse.text();
       debugLog.responseStatus = submitResponse.status;
       debugLog.responseBody = errText;
       throw new Error(`Together AI Submit Failed: ${submitResponse.status} - ${errText}`);
    }

    const result = await submitResponse.json();

    // Validate Result
    if (result && result.data && result.data.length > 0) {
        const b64Json = result.data[0].b64_json;
        let base64 = b64Json;
        if (!base64.startsWith('data:image')) {
            base64 = `data:image/png;base64,${base64}`;
        }
        
        // Convert to Blob for upload
        const base64Data = base64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const imageBlob = new Blob([byteArray], { type: 'image/png' });
        
        // Upload to public storage
        let publicUrl = base64;
        try {
            const file = new File([imageBlob], `together-${Date.now()}.png`, { type: 'image/png' });
            publicUrl = await uploadImage(file);
        } catch (uploadError) {
            console.warn("Failed to upload image to public storage, falling back to base64", uploadError);
        }
        
        const endTime = Date.now();
        debugLog.responseStatus = 200;
        debugLog.responseBody = result;
        debugLog.duration = endTime - startTime;

        return { base64, url: publicUrl, debug: debugLog };
    } else {
        // Handle Missing Images
        debugLog.responseBody = result;
        debugLog.responseStatus = 200; // technically API succeeded but logic failed
        debugLog.duration = Date.now() - startTime;
        
        const errorMsg = result?.error || JSON.stringify(result);
        throw new Error(`Together AI returned no images. Details: ${errorMsg}`);
    }

  } catch (error: any) {
    debugLog.duration = Date.now() - startTime;
    debugLog.responseBody = debugLog.responseBody || error.message;
    error.debug = debugLog;
    throw error;
  }
};
