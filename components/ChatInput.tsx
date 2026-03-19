import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, X, UploadCloud } from 'lucide-react';
import { uploadImage } from '../services/uploadService';

interface ChatInputProps {
  onSend: (message: string, role: 'user' | 'assistant', attachments?: string[], base64Images?: string[]) => void;
  isLoading: boolean;
  showAttachments?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, showAttachments = false }) => {
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedBase64s, setSelectedBase64s] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && selectedImages.length === 0) || isLoading || isUploading) return;
    
    onSend(
      input, 
      'user', 
      selectedImages.length > 0 ? selectedImages : undefined,
      selectedBase64s.length > 0 ? selectedBase64s : undefined
    );

    setInput('');
    setSelectedImages([]);
    setSelectedBase64s([]);
    // Reset height
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Cast to File[] to ensure TS treats elements as File objects
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 3) {
      alert("You can only upload a maximum of 3 images.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const newImages: string[] = [];
      const newBase64s: string[] = [];

      for (const file of files) {
          if (file.size > 5 * 1024 * 1024) {
             alert(`File ${file.name} is too large. Please select images under 5MB.`);
             continue; 
          }

          // 1. Generate local Base64 (for Gemini Vision)
          const base64 = await fileToBase64(file);
          
          // 2. Upload to get URL (for Pollinations/Display/Gemini Reference)
          const url = await uploadImage(file);
          
          newBase64s.push(base64);
          newImages.push(url);
      }

      setSelectedBase64s(prev => [...prev, ...newBase64s]);
      setSelectedImages(prev => [...prev, ...newImages]);

    } catch (error) {
      alert("Failed to upload image. Please try again.");
      console.error(error);
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
      setSelectedBase64s(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 pb-6 md:pb-4 transition-colors duration-300">
      <div className="max-w-3xl mx-auto relative">
        
        {/* Image Preview */}
        {(selectedImages.length > 0 || isUploading) && (
          <div className="flex flex-wrap gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {selectedImages.map((img, idx) => (
                <div key={idx} className="relative group">
                    <img 
                      src={img} 
                      alt={`Selected ${idx}`} 
                      className="h-20 w-auto rounded-xl border border-slate-700 shadow-sm object-cover"
                    />
                    {!isUploading && (
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                    )}
                </div>
            ))}
            
            {isUploading && (
                <div className="h-20 w-20 rounded-xl border border-slate-700 bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mb-1" />
                  <span className="text-[10px] font-medium">Uploading</span>
                </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 rounded-3xl p-2 border transition-all shadow-sm hover:shadow-md bg-slate-800 border-slate-700 focus-within:border-primary/60 focus-within:ring-primary/20">
          
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {showAttachments && (
            <button
              type="button"
              onClick={() => {
                  if (selectedImages.length >= 3) {
                        alert("Maximum 3 images allowed.");
                        return;
                  }
                  fileInputRef.current?.click();
              }}
              disabled={isLoading || isUploading}
              className={`p-3 rounded-full flex-shrink-0 transition-colors ${isLoading || isUploading ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-primary hover:bg-primary/10'}`}
              title="Add Image"
            >
              {isUploading ? <UploadCloud size={20} className="animate-pulse"/> : <Paperclip size={20} />}
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your logo idea..."
            className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-2 max-h-[120px] placeholder-slate-400 text-base text-slate-100 font-medium"
            rows={1}
            disabled={isLoading || isUploading}
          />
          <button
            type="submit"
            disabled={(!input.trim() && selectedImages.length === 0) || isLoading || isUploading}
            className={`p-3 rounded-full flex-shrink-0 transition-all duration-200
              ${(!input.trim() && selectedImages.length === 0) || isLoading || isUploading
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-primary text-slate-950 shadow-md hover:opacity-90 hover:scale-105 active:scale-95'
              }
            `}
            title="Send message to AI"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-500 mt-2">
          AI generates logos using Pollinations. Images are uploaded to tmpfiles.org.
        </p>
      </div>
    </div>
  );
};

export default ChatInput;