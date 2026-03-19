
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    // We use tmpfiles.org as a free temporary storage for the demo.
    // In a production environment, this should be replaced with your own S3/Cloudinary backend.
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.data.url) {
       // Convert display URL to direct download URL for tmpfiles.org
       // Example: https://tmpfiles.org/12345/file.png -> https://tmpfiles.org/dl/12345/file.png
       // This is necessary because the default URL is a viewer page.
       return data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    }
    
    throw new Error('Invalid response structure from upload service');
  } catch (error) {
    console.error("Image Upload Error:", error);
    throw error;
  }
};
