import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import DebugPanel from './components/DebugPanel';
import Logo from './components/Logo';
import { Message, NetworkLogItem, ModelMode, ImageModelMode } from './types';
import { sendChatRequest, generateImage, enhanceImagePrompt } from './services/pollinationsService';
import { generateImageTogether } from './services/togetherService';
import { sendGeminiChatRequest, enhanceImagePromptGemini, summarizeChatHistory } from './services/geminiService';
import { sendOpenAiChatRequest, enhanceImagePromptOpenAi } from './services/openaiService';
import { countTokens } from './services/tokenService';
import { calculateGeminiCost, PRICING } from './services/pricingService';
import { 
  initDB, 
  getLatestPrompt, 
  savePromptVersion, 
  seedInitialData,
  saveChatHistory,
  clearChatHistory
} from './services/dbService';
import { 
  SYSTEM_PROMPT as DEFAULT_SYSTEM_PROMPT, 
  DEFAULT_ENHANCER_PROMPT 
} from './constants';
import { Menu } from 'lucide-react';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "{\"response_msg\": \"Hey, I'm Logowiz AI! I can create a brand-new logo for you, edit your existing logo, change colors, tweak shapes and text, or even bring your ideas to life from scratch. Just tell me what you want, and I’ll make it happen.\"}",
  displayContent: "Hey, I'm Logowiz AI! I can create a brand-new logo for you, edit your existing logo, change colors, tweak shapes and text, or even bring your ideas to life from scratch. Just tell me what you want, and I’ll make it happen.",
  type: 'text'
};

const DEFAULT_FAL_KEY = '56897922-c433-4737-8639-6c2b5d66a9d1:a6d4adbbfb244da5286eb582ee175fa9';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Prompt States
  const [useCodebasePrompt, setUseCodebasePrompt] = useState<boolean>(() => {
    const saved = localStorage.getItem('useCodebasePrompt');
    return saved !== null ? saved === 'true' : true; 
  });

  const [useCodebaseEnhancerPrompt, setUseCodebaseEnhancerPrompt] = useState<boolean>(() => {
    const saved = localStorage.getItem('useCodebaseEnhancerPrompt');
    return saved !== null ? saved === 'true' : true; 
  });

  // UI Preference States - Default to FALSE (Hidden) as requested
  const [showAttachments, setShowAttachments] = useState<boolean>(() => {
    const saved = localStorage.getItem('showAttachments');
    return saved !== null ? saved === 'true' : false; 
  });

  const [isSummaryModeEnabled, setIsSummaryModeEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('isSummaryModeEnabled');
    return saved !== null ? saved === 'true' : false; 
  });

  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [enhancerPrompt, setEnhancerPrompt] = useState(DEFAULT_ENHANCER_PROMPT);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle

  const [networkLogs, setNetworkLogs] = useState<NetworkLogItem[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  
  // Models - Set Gemini and Seedream as defaults, load from storage
  const [modelMode, setModelMode] = useState<ModelMode>(() => {
    const saved = localStorage.getItem('modelMode');
    return (saved as ModelMode) || 'gemini-2.5-flash';
  });
  
  const [enhancerModelMode, setEnhancerModelMode] = useState<ModelMode>(() => {
    const saved = localStorage.getItem('enhancerModelMode');
    // Default to the same as modelMode if not set
    return (saved as ModelMode) || (localStorage.getItem('modelMode') as ModelMode) || 'gemini-2.5-flash';
  });
  
  const [imageModelMode, setImageModelMode] = useState<ImageModelMode>(() => {
    const saved = localStorage.getItem('imageModelMode');
    return (saved as ImageModelMode) || 'together-seedream';
  });
  
  const [pollinationsTextModel, setPollinationsTextModel] = useState<string>(() => {
    return localStorage.getItem('pollinationsTextModel') || 'gemini-fast';
  });

  const [pollinationsImageModel, setPollinationsImageModel] = useState<string>(() => {
    return localStorage.getItem('pollinationsImageModel') || 'flux-2-dev';
  });
  
  // Initialize Key with Default if not found
  const [togetherApiKey, setTogetherApiKey] = useState<string>(() => {
    return localStorage.getItem('togetherApiKey') || '';
  });
  const [openAiApiKey, setOpenAiApiKey] = useState<string>(() => {
    return localStorage.getItem('openAiApiKey') || '';
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check Local Storage for Keys
  useEffect(() => {
    const key = localStorage.getItem('togetherApiKey');
    if (key) setTogetherApiKey(key);
    
    const openAiKey = localStorage.getItem('openAiApiKey');
    if (openAiKey) setOpenAiApiKey(openAiKey);

    // Listen for storage events (e.g. from Settings Modal saving)
    const handleStorage = () => {
        const newKey = localStorage.getItem('togetherApiKey');
        if (newKey) setTogetherApiKey(newKey);
        
        const newOpenAiKey = localStorage.getItem('openAiApiKey');
        if (newOpenAiKey) setOpenAiApiKey(newOpenAiKey);
    };
    
    window.addEventListener('storage', handleStorage);
    // Also poll manually when settings close since storage event doesn't fire on same tab
    const interval = setInterval(handleStorage, 1000);
    
    return () => {
        window.removeEventListener('storage', handleStorage);
        clearInterval(interval);
    };
  }, [isSettingsOpen]);

  // Persist model settings
  useEffect(() => {
    localStorage.setItem('modelMode', modelMode);
    localStorage.setItem('enhancerModelMode', enhancerModelMode);
    localStorage.setItem('imageModelMode', imageModelMode);
    localStorage.setItem('pollinationsTextModel', pollinationsTextModel);
    localStorage.setItem('pollinationsImageModel', pollinationsImageModel);
  }, [modelMode, enhancerModelMode, imageModelMode, pollinationsTextModel, pollinationsImageModel]);

  // --- Theme Extraction Logic ---
  useEffect(() => {
    const extractColor = () => {
      const img = new Image();
      img.src = '/logo.png';
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        
        // Resize to small size for faster processing
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        
        const data = ctx.getImageData(0, 0, 50, 50).data;
        const colorCounts: Record<string, number> = {};
        let maxCount = 0;
        // Default to Neon Green #62FFB8
        let dominantR = 98;
        let dominantG = 255;
        let dominantB = 184;

        // Sample pixels
        for(let i=0; i<data.length; i+=4) {
           const alpha = data[i+3];
           if(alpha < 200) continue; // Skip transparent pixels
           
           const r = data[i];
           const g = data[i+1];
           const b = data[i+2];

           // Filter out whites, blacks, and low saturation to find the "Brand" color
           const avg = (r + g + b) / 3;
           if (avg > 240 || avg < 20) continue; // Ignore white/black

           // Calculate Saturation approx
           const max = Math.max(r, g, b);
           const min = Math.min(r, g, b);
           const saturation = max - min;
           
           if (saturation < 30) continue; // Ignore dull/grayish colors

           // Quantize to group similar colors
           const roundedR = Math.round(r / 20) * 20;
           const roundedG = Math.round(g / 20) * 20;
           const roundedB = Math.round(b / 20) * 20;
           
           const key = `${roundedR},${roundedG},${roundedB}`;
           colorCounts[key] = (colorCounts[key] || 0) + 1;
           
           if(colorCounts[key] > maxCount) {
             maxCount = colorCounts[key];
             // Use original values for the variable, not quantized
             dominantR = r;
             dominantG = g;
             dominantB = b;
           }
        }
        
        // Ensure visibility on dark background
        // Perceived brightness formula
        const brightness = (dominantR * 299 + dominantG * 587 + dominantB * 114) / 1000;
        
        // If too dark (brightness < 120), lighten it
        if (brightness < 120) {
            const factor = 1.4; // Lighten by 40%
            dominantR = Math.min(255, Math.floor(dominantR * factor));
            dominantG = Math.min(255, Math.floor(dominantG * factor));
            dominantB = Math.min(255, Math.floor(dominantB * factor));
        }

        if (maxCount > 0) {
            document.documentElement.style.setProperty('--primary-rgb', `${dominantR} ${dominantG} ${dominantB}`);
        }
      };
    };
    
    extractColor();
  }, []);

  // Initialize DB and load saved data
  useEffect(() => {
    const initialize = async () => {
      try {
        await initDB();
        await seedInitialData();
        
        // Load System Prompt
        if (useCodebasePrompt) {
          setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        } else {
          const savedSysPrompt = await getLatestPrompt('system');
          if (savedSysPrompt) setSystemPrompt(savedSysPrompt);
        }

        // Load Enhancer Prompt
        if (useCodebaseEnhancerPrompt) {
          setEnhancerPrompt(DEFAULT_ENHANCER_PROMPT);
        } else {
          const savedEnhancerPrompt = await getLatestPrompt('enhancer');
          if (savedEnhancerPrompt) setEnhancerPrompt(savedEnhancerPrompt);
        }

        await clearChatHistory();

      } catch (err) {
        console.error("Failed to initialize database:", err);
      } finally {
        setIsDataLoaded(true);
      }
    };
    initialize();
  }, [useCodebasePrompt, useCodebaseEnhancerPrompt]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('useCodebasePrompt', String(useCodebasePrompt));
    localStorage.setItem('useCodebaseEnhancerPrompt', String(useCodebaseEnhancerPrompt));
    localStorage.setItem('showAttachments', String(showAttachments));
    localStorage.setItem('isSummaryModeEnabled', String(isSummaryModeEnabled));
  }, [useCodebasePrompt, useCodebaseEnhancerPrompt, showAttachments, isSummaryModeEnabled]);

  useEffect(() => {
    if (!isDataLoaded) return;
    if (messages.length > 0) {
        saveChatHistory(messages).catch(err => console.error("Failed to save chat history:", err));
    }
    scrollToBottom();
  }, [messages, isDataLoaded]);

  useEffect(() => {
    const count = countTokens(systemPrompt, messages);
    setTotalTokens(count);
  }, [messages, systemPrompt]);

  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear the conversation?")) {
      setMessages([{ ...INITIAL_MESSAGE }]);
      setTotalCost(0);
      // Close mobile sidebar if open
      setIsSidebarOpen(false);
    }
  };

  const handleSavePrompt = async (newPrompt: string, note: string = "User Update", type: 'system' | 'enhancer') => {
    try {
      await savePromptVersion(newPrompt, note, note.includes("Optimize") ? 'ai' : 'user', type);
      
      if (type === 'system') {
        setSystemPrompt(newPrompt);
        setUseCodebasePrompt(false); 
      } else if (type === 'enhancer') {
        setEnhancerPrompt(newPrompt);
        setUseCodebaseEnhancerPrompt(false);
      }
    } catch (err) {
      console.error("Failed to save prompt:", err);
      // Fallback update local state even if save failed
      if (type === 'system') setSystemPrompt(newPrompt);
      else if (type === 'enhancer') setEnhancerPrompt(newPrompt);
    }
  };
  
  const handleResetPrompt = async (type: 'system' | 'enhancer') => {
      let defaultContent = DEFAULT_SYSTEM_PROMPT;
      if (type === 'enhancer') defaultContent = DEFAULT_ENHANCER_PROMPT;
      
      await handleSavePrompt(defaultContent, "Reset to Default", type);
  };

  const getModelNameDisplay = () => {
    if (modelMode === 'pollinations') return 'Standard';
    if (modelMode === 'openai') return 'OpenAI (GPT-5.4 Nano)';
    if (modelMode === 'gemini-2.5-pro') return 'Gemini 2.5 Pro';
    if (modelMode === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
    return 'Gemini 2.5 Flash';
  };

  const handleSendMessage = async (content: string, role: 'user' | 'assistant', attachments?: string[], base64Images?: string[]) => {
    let displayContent = content;
    let rawContent = content;

    if (role === 'assistant') {
      try {
        const parsed = JSON.parse(content);
        if (parsed.response_msg) displayContent = parsed.response_msg;
      } catch (e) {
        // Not JSON
      }
    }

    const newMessage: Message = {
      role: role,
      content: rawContent,
      displayContent: displayContent,
      type: 'text',
      attachments: attachments,
      base64Images: base64Images
    };

    setMessages(prev => [...prev, newMessage]);

    if (role === 'assistant') {
      return;
    }

    setIsLoading(true);

    try {
      let responseData, debugInfo;

      if (modelMode === 'pollinations') {
        const { data, debug } = await sendChatRequest([...messages, newMessage], systemPrompt, pollinationsTextModel);
        responseData = data;
        debugInfo = debug;
      } else if (modelMode === 'openai') {
        const { data, debug } = await sendOpenAiChatRequest([...messages, newMessage], systemPrompt, openAiApiKey);
        responseData = data;
        debugInfo = debug;
      } else {
        const modelName = modelMode === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
        const { data, debug, usage } = await sendGeminiChatRequest([...messages, newMessage], systemPrompt, modelName);
        responseData = data;
        debugInfo = debug;
        if (usage) {
          setTotalCost(prev => prev + calculateGeminiCost(modelName, usage));
        }
      }
      
      setNetworkLogs(prev => [...prev, debugInfo]);

      const newMessages: Message[] = [];

      if (responseData.response_msg) {
        newMessages.push({
          role: 'assistant',
          content: JSON.stringify({ response_msg: responseData.response_msg }), 
          displayContent: responseData.response_msg,
          type: 'text'
        });
      }

      if ((responseData.tool_code === 1 || responseData.tool_code === 2) && responseData.prompt) {
        
        let finalPrompt = responseData.prompt;

        // Run Enhancer if Generating New Image (Tool Code 1)
        if (responseData.tool_code === 1) {
            try {
              let enhancerResult;
              if (enhancerModelMode === 'pollinations') {
                enhancerResult = await enhanceImagePrompt(finalPrompt, enhancerPrompt, 1, undefined, pollinationsTextModel);
              } else if (enhancerModelMode === 'openai') {
                enhancerResult = await enhanceImagePromptOpenAi(finalPrompt, enhancerPrompt, 1, undefined, openAiApiKey);
              } else {
                const modelName = enhancerModelMode === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
                enhancerResult = await enhanceImagePromptGemini(finalPrompt, enhancerPrompt, 1, undefined, modelName);
                if (enhancerResult.usage) {
                  setTotalCost(prev => prev + calculateGeminiCost(modelName, enhancerResult.usage));
                }
              }
              const { enhancedPrompt, debug: enhancerDebug } = enhancerResult;
              setNetworkLogs(prev => [...prev, enhancerDebug]);
              finalPrompt = enhancedPrompt;
            } catch (enhancerErr: any) {
               console.error("Enhancer failed, using original prompt", enhancerErr);
               if (enhancerErr.debug) setNetworkLogs(prev => [...prev, enhancerErr.debug]);
            }
        }

        newMessages.push({
           role: 'assistant',
           content: JSON.stringify({
             prompt: finalPrompt,
             tool_code: responseData.tool_code,
             image_input: responseData.image_input
           }),
           displayContent: "",
           type: 'text',
           isHidden: true
        });
        
        let imageInput = responseData.image_input && responseData.image_input.length > 0 ? responseData.image_input[0] : undefined;
        
        // --- IMAGE GENERATION LOGIC ---
        try {
          let genResult;
          
          const isTogetherEnabled = imageModelMode === 'together-seedream' && !!togetherApiKey;
          const isEdit = responseData.tool_code === 2;
          const isGen = responseData.tool_code === 1;

          // Decide whether to use Together AI or Pollinations
          if (isTogetherEnabled && (isGen || isEdit)) {
             // TOGETHER GEN (Use Gen for both since we don't have an edit endpoint for Together AI yet)
             const { base64, url, debug } = await generateImageTogether(finalPrompt, togetherApiKey);
             genResult = { base64, url };
             setNetworkLogs(prev => [...prev, debug]);
             setTotalCost(prev => prev + PRICING.TOGETHER_AI_IMAGE);
          } else {
             // USE POLLINATIONS (Fallback or Default)
             const { base64, url, debug } = await generateImage(finalPrompt, imageInput, pollinationsImageModel);
             genResult = { base64, url };
             setNetworkLogs(prev => [...prev, debug]);
          }

           newMessages.push({
            role: 'user', 
            content: `[System: Image generated]\n\n${genResult.url}`,
            displayContent: "Generated Image",
            type: 'image',
            imageUrl: genResult.base64, 
            attachments: [genResult.url] 
          });

        } catch (err: any) {
           console.error("Generation Error", err);
           if (err.debug) {
             setNetworkLogs(prev => [...prev, err.debug]);
           }
           
           newMessages.push({
             role: 'system', // Use 'system' role so it's filtered out of conversation history sent to API
             content: JSON.stringify({ response_msg: "Failed to generate image." }),
             displayContent: `Failed to generate image: ${err.message}. ${imageModelMode === 'together-seedream' && !togetherApiKey ? 'Please configure your API Key in Settings.' : ''}`,
             type: 'error'
           });
        }
        
        // --- SUMMARY MODE LOGIC ---
        // Find the index of the last summary message by checking if displayContent starts with the known string
        let lastSummaryIdx = -1;
        const allMsgs = [...messages, newMessage, ...newMessages];
        for (let i = allMsgs.length - 1; i >= 0; i--) {
           if (allMsgs[i].displayContent && allMsgs[i].displayContent?.startsWith("Conversation history summarized to save tokens.")) {
               lastSummaryIdx = i;
               break;
           }
        }
        
        const msgsSinceSummary = allMsgs.slice(lastSummaryIdx === -1 ? 0 : lastSummaryIdx + 1);
        const imagesSinceSummary = msgsSinceSummary.filter(m => m.type === 'image');

        if (isSummaryModeEnabled && imagesSinceSummary.length >= 2) {
          const allMsgsBeforeSummary = [...messages, newMessage]; 
          try {
            const summaryModel = modelMode === 'gemini-2.5-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
            const { summary, debug: sumDebug, usage: sumUsage } = await summarizeChatHistory(allMsgsBeforeSummary, summaryModel);
            
            if (sumDebug) setNetworkLogs(prev => [...prev, sumDebug]);
            if (sumUsage) setTotalCost(prev => prev + calculateGeminiCost(summaryModel, sumUsage));

            // Extract all image URLs from the history we are about to delete
            const urls = imagesSinceSummary.flatMap(m => m.attachments || []);
            const urlText = urls.length > 0 ? `\\n\\nRetained Image URLs:\\n${urls.map((u, i) => `${i + 1}. ${u}`).join('\\n')}` : '';

            const summaryMsg: Message = {
               role: 'user',
               content: `[System Context: Previous conversation summarized to save tokens]\\n\\n${summary}${urlText}`,
               displayContent: `Conversation history summarized to save tokens.${urlText}`,
               type: 'text' // Custom UI presentation
            };
            
            setMessages([INITIAL_MESSAGE, summaryMsg]);
            setIsLoading(false);
            return; 
          } catch (err) {
            console.error("Summary Generation Error", err);
          }
        }
      }

      setMessages(prev => [...prev, ...newMessages]);

    } catch (error: any) {
      console.error("Error processing message:", error);
      if (error.debug) {
        setNetworkLogs(prev => [...prev, error.debug]);
      }
      
      let errorMessage = "Sorry, I encountered an issue connecting to the design studio. Please try again.";
      if (modelMode === 'openai' && !openAiApiKey) {
        errorMessage = "OpenAI API Key is required. Please configure it in Settings.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      setMessages(prev => [...prev, {
        role: 'system',
        content: "Error",
        displayContent: errorMessage,
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        modelMode={modelMode}
        setModelMode={setModelMode}
        enhancerModelMode={enhancerModelMode}
        setEnhancerModelMode={setEnhancerModelMode}
        imageModelMode={imageModelMode}
        setImageModelMode={setImageModelMode}
        togetherApiKey={togetherApiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        totalTokens={totalTokens}
        totalCost={totalCost}
        onClearChat={handleClearChat}
        onOpenDebug={() => setIsDebugOpen(true)}
        debugLogCount={networkLogs.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          systemPrompt={systemPrompt}
          enhancerPrompt={enhancerPrompt}
          onSave={handleSavePrompt}
          onReset={handleResetPrompt}
          logs={networkLogs}
          useCodebasePrompt={useCodebasePrompt}
          onToggleCodebase={setUseCodebasePrompt}
          useCodebaseEnhancerPrompt={useCodebaseEnhancerPrompt}
          onToggleCodebaseEnhancer={setUseCodebaseEnhancerPrompt}
          showAttachments={showAttachments}
          onToggleShowAttachments={setShowAttachments}
          isSummaryModeEnabled={isSummaryModeEnabled}
          onToggleSummaryMode={setIsSummaryModeEnabled}
          modelMode={modelMode}
          setModelMode={setModelMode}
          imageModelMode={imageModelMode}
          setImageModelMode={setImageModelMode}
          pollinationsTextModel={pollinationsTextModel}
          setPollinationsTextModel={setPollinationsTextModel}
          pollinationsImageModel={pollinationsImageModel}
          setPollinationsImageModel={setPollinationsImageModel}
        />

        <DebugPanel 
          isOpen={isDebugOpen}
          onClose={() => setIsDebugOpen(false)}
          logs={networkLogs}
          onClearLogs={() => setNetworkLogs([])}
        />

        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
           <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50"></div>
           <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px] mix-blend-screen opacity-40"></div>
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden flex-shrink-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10 sticky top-0 px-4 py-3 flex items-center justify-between">
          <Logo />
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 z-0 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, index) => (
              <ChatMessage 
                key={index} 
                message={msg} 
                showAttachments={showAttachments} 
              />
            ))}
            
            {isLoading && (
              <div className="flex justify-start w-full mb-6">
                 <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-800 shadow-sm">
                   <div className={`flex space-x-1 ${modelMode === 'openai' ? 'text-indigo-400' : modelMode === 'gemini-2.5-pro' ? 'text-rose-400' : modelMode === 'gemini-2.5-flash' ? 'text-amber-400' : 'text-primary'}`}>
                     <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                     <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                     <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                   </div>
                   <span className="text-xs text-slate-400 font-medium">Logowiz ({getModelNameDisplay()}) is thinking...</span>
                 </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <footer className="flex-shrink-0 z-20">
          <ChatInput 
            onSend={handleSendMessage} 
            isLoading={isLoading} 
            showAttachments={showAttachments} // Pass the prop
          />
        </footer>
      </div>
    </div>
  );
};

export default App;