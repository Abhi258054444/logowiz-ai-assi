import { NetworkLogItem } from '../types';
import { uploadImage } from './uploadService';

const GPT_IMAGE_GEN_URL = '/photo_editor_lab_backend_copy/api/public/api/generateGptImage';
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjIsImlzcyI6Imh0dHA6Ly8xOTIuMTY4LjAuMTk5L3Bob3RvX2VkaXRvcl9sYWJfYmFja2VuZCUyMCUyOGNvcHklMjkvYXBpL3B1YmxpYy9hcGkvZG9Mb2dpbkZvckd1ZXN0IiwiaWF0IjoxNzg0MjYyODkwLCJleHAiOjE3ODQ4Njc2OTAsIm5iZiI6MTc4NDI2Mjg5MCwianRpIjoicXlZa3Z1Y2JKZVkzU2s1RCJ9.DD4EyToEXsN8HsC9gLeLfi7xMXJrx6lz_I3nLiUBMUE';

export const generateGptImage = async (prompt: string, imageUrls?: string[], token: string = DEFAULT_TOKEN, size: string = "1040x1280"): Promise<{ base64: string, url: string, debug: NetworkLogItem }> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  const requestPayload = { 
      prompt,
      size,
      quality: "low",
      url: imageUrls || []
  };

  let debugLog: NetworkLogItem = {
      id: requestId,
      timestamp: startTime,
      url: GPT_IMAGE_GEN_URL,
      method: 'POST',
      requestHeaders: { 'Authorization': 'Bearer [HIDDEN]' },
      requestBody: requestPayload,
      responseStatus: 0,
      responseBody: null,
      duration: 0
  };

  try {
    const submitResponse = await fetch(GPT_IMAGE_GEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!submitResponse.ok) {
       const errText = await submitResponse.text();
       debugLog.responseStatus = submitResponse.status;
       debugLog.responseBody = errText;
       throw new Error(`GPT Image Gen Failed: ${submitResponse.status} - ${errText}`);
    }

    const result = await submitResponse.json();

    // Validate Result
    if (result && result.code === 200 && result.data && result.data.image_url) {
        const imageUrl = result.data.image_url;
        
        // Since we get a URL, we will fetch it to convert to base64 if needed,
        // or just use the URL directly. It's better to fetch and convert to base64 
        // to be consistent with the existing app flow.
        
        let base64 = imageUrl;
        try {
            // Replace the hardcoded IP with relative path to go through the proxy if it's there
            let fetchUrl = imageUrl;
            if (fetchUrl.startsWith('http://192.168.0.199')) {
                fetchUrl = fetchUrl.replace('http://192.168.0.199', '');
            }
            
            const imgResponse = await fetch(fetchUrl);
            const blob = await imgResponse.blob();
            base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
        } catch (fetchErr) {
            console.warn("Could not convert image URL to base64, using URL directly", fetchErr);
        }

        const endTime = Date.now();
        debugLog.responseStatus = 200;
        debugLog.responseBody = result;
        debugLog.duration = endTime - startTime;

        return { base64, url: imageUrl, debug: debugLog };
    } else {
        // Handle Failure from backend
        debugLog.responseBody = result;
        debugLog.responseStatus = 200; 
        debugLog.duration = Date.now() - startTime;
        
        const errorMsg = result?.message || JSON.stringify(result);
        throw new Error(`GPT Image API returned error. Details: ${errorMsg}`);
    }

  } catch (error: any) {
    debugLog.duration = Date.now() - startTime;
    debugLog.responseBody = debugLog.responseBody || error.message;
    error.debug = debugLog;
    throw error;
  }
};
