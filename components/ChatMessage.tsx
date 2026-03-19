import React, { useState } from 'react';
import { Message } from '../types';
import { Bot, User, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  showAttachments?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, showAttachments = false }) => {
  // If message is marked as hidden (e.g. internal Tool JSON), don't render it
  if (message.isHidden) return null;

  // Determine if this is a "User" message for UI purposes
  // It is a user message IF:
  // 1. role is 'user'
  // 2. AND it is NOT a generated image (which has imageUrl property)
  // Note: We changed generated image role to 'user' for API context, but UI should show as assistant/tool output
  const isUser = message.role === 'user' && !message.imageUrl;
  
  const isImage = message.type === 'image';
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary text-slate-950' : 'bg-green-600 text-white shadow-sm'}`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div 
            className={`px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed tracking-wide whitespace-pre-wrap overflow-hidden
              ${isUser 
                ? 'bg-primary text-slate-950 font-semibold rounded-br-none' 
                : 'bg-slate-900 text-slate-100 font-normal border border-slate-800 rounded-bl-none'
              }
              ${isImage ? 'p-1 bg-transparent border-0 shadow-none' : ''}
            `}
          >
            {/* User Uploaded Images - Only for Actual User Messages */}
            {isUser && message.attachments && message.attachments.length > 0 && showAttachments && (
              <div className="mb-3">
                 {message.attachments.map((imgSrc, idx) => (
                   <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-950/20 max-w-[200px]">
                      <img src={imgSrc} alt="User upload" className="w-full h-auto object-cover" />
                   </div>
                 ))}
                 {/* If there is text accompanying the image, show it below */}
                 {message.content && <div className="mt-2 pt-2 border-t border-slate-950/20">{message.displayContent || message.content}</div>}
              </div>
            )}

            {/* Assistant/Tool Generated Images */}
            {/* Display if it's NOT a user message (UI-wise) AND has an imageUrl */}
            {!isUser && isImage && message.imageUrl ? (
              <div className="flex flex-col gap-2">
                <div className="relative group overflow-hidden rounded-xl bg-slate-900 border border-slate-800 min-w-[280px] md:min-w-[320px] min-h-[280px]">
                  {!imgLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                      <div className="animate-pulse flex flex-col items-center">
                         <ImageIcon className="w-8 h-8 mb-2 opacity-50"/>
                         <span className="text-xs font-medium">Generating Design...</span>
                      </div>
                    </div>
                  )}
                  <img 
                    src={message.imageUrl} 
                    alt="Generated Logo" 
                    className={`w-full h-auto object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImgLoaded(true)}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                    <a 
                      href={message.imageUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white hover:text-blue-200 transition-colors flex items-center gap-1 text-xs font-medium bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10"
                    >
                      <ExternalLink size={14} /> Full Size
                    </a>
                    <a 
                      href={message.imageUrl} 
                      download="logowiz-design.png"
                      className="text-white hover:text-blue-200 transition-colors flex items-center gap-1 text-xs font-medium bg-primary/90 px-3 py-1.5 rounded-full shadow-lg"
                    >
                      <Download size={14} /> Download
                    </a>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium px-1 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Generated via Pollinations AI
                </div>
              </div>
            ) : (
              // Standard Text Message
              // Render if:
              // 1. It's user and has NO attachments (since attachments block handles text if they exist + showAttachments is true)
              // 2. OR It's user and has attachments BUT they are hidden (so we must render text here)
              // 3. OR It's assistant and NOT an image
              (
                (isUser && ((!message.attachments || message.attachments.length === 0) || !showAttachments)) ||
                (!isUser && !(isImage && message.imageUrl))
              ) && (message.displayContent || message.content)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;