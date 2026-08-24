
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    // Use Pollinations Media API for reliable direct image hosting
    const response = await fetch('https://media.pollinations.ai/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk_hMj1ChErTmb71vZyq39K8w5Z8etR3V0w'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.url) {
       return data.url;
    }
    
    throw new Error('Invalid response structure from Pollinations upload service');
  } catch (error) {
    console.error("Image Upload Error:", error);
    throw error;
  }
};
