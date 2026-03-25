import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Settings, Sparkles, MessageSquareWarning, History, Bot, User, HardDrive, Copy, Check, FileText, LayoutTemplate, Wand2, FileCode, Database, Key, Eye, Zap, Feather, Image as ImageIcon, Camera, Pencil } from 'lucide-react';
import { NetworkLogItem, PromptVersion, ModelMode, ImageModelMode } from '../types';
import { generateOptimizationPromptTemplate } from '../services/geminiService';
import { getPromptHistory } from '../services/dbService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  enhancerPrompt: string;
  onSave: (prompt: string, note: string, type: 'system' | 'enhancer') => void;
  onReset: (type: 'system' | 'enhancer') => void;
  logs: NetworkLogItem[];
  useCodebasePrompt: boolean;
  onToggleCodebase: (val: boolean) => void;
  useCodebaseEnhancerPrompt: boolean;
  onToggleCodebaseEnhancer: (val: boolean) => void;
  showAttachments: boolean;
  onToggleShowAttachments: (val: boolean) => void;
  isSummaryModeEnabled: boolean;
  onToggleSummaryMode: (val: boolean) => void;
  modelMode: ModelMode;
  setModelMode: (mode: ModelMode) => void;
  imageModelMode: ImageModelMode;
  setImageModelMode: (mode: ImageModelMode) => void;
  pollinationsTextModel: string;
  setPollinationsTextModel: (model: string) => void;
  pollinationsImageModel: string;
  setPollinationsImageModel: (model: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  systemPrompt,
  enhancerPrompt, 
  onSave,
  onReset,
  logs,
  useCodebasePrompt,
  onToggleCodebase,
  useCodebaseEnhancerPrompt,
  onToggleCodebaseEnhancer,
  showAttachments,
  onToggleShowAttachments,
  isSummaryModeEnabled,
  onToggleSummaryMode,
  modelMode,
  setModelMode,
  imageModelMode,
  setImageModelMode,
  pollinationsTextModel,
  setPollinationsTextModel,
  pollinationsImageModel,
  setPollinationsImageModel
}) => {
  const [activeType, setActiveType] = useState<'system' | 'enhancer'>('system');
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [activeTab, setActiveTab] = useState<'editor' | 'optimize' | 'history' | 'keys' | 'prefs'>('editor');
  
  // API Keys State
  const [togetherKey, setTogetherKey] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');

  // Optimization State
  const [issueDescription, setIssueDescription] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // History State
  const [history, setHistory] = useState<PromptVersion[]>([]);
  const [saveNote, setSaveNote] = useState('');

  // Sync local prompt when active type or external props change
  useEffect(() => {
    if (isOpen) {
      if (activeType === 'system') setLocalPrompt(systemPrompt);
      else if (activeType === 'enhancer') setLocalPrompt(enhancerPrompt);
      
      setTogetherKey(localStorage.getItem('togetherApiKey') || '');
      setOpenAiKey(localStorage.getItem('openAiApiKey') || '');
    }
  }, [isOpen, activeType, systemPrompt, enhancerPrompt]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setIssueDescription('');
      setGeneratedPrompt('');
      setSaveNote('');
      setActiveTab('editor');
      loadHistory();
    }
  }, [isOpen]);

  // Reload history when tab or type changes
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, activeType]);

  const loadHistory = async () => {
    try {
      const records = await getPromptHistory(activeType);
      setHistory(records);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleGeneratePrompt = () => {
    if (!issueDescription.trim()) return;
    
    const template = generateOptimizationPromptTemplate(localPrompt, logs, issueDescription);
    setGeneratedPrompt(template);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestore = (version: PromptVersion) => {
    if (window.confirm("Restore this version? Unsaved changes in the editor will be lost.")) {
      setLocalPrompt(version.content);
      setSaveNote(`Restored from ${new Date(version.timestamp).toLocaleDateString()}`);
      setActiveTab('editor');
      if (activeType === 'system') {
        onToggleCodebase(false); 
      } else if (activeType === 'enhancer') {
        onToggleCodebaseEnhancer(false);
      }
    }
  };

  const handleSaveChanges = () => {
    // Save Prompts
    onSave(localPrompt, saveNote || "Manual Update", activeType);
    
    // Save Keys
    localStorage.setItem('togetherApiKey', togetherKey.trim());
    localStorage.setItem('openAiApiKey', openAiKey.trim());
    
    onClose();
  };

  const isLocked = activeType === 'system' ? useCodebasePrompt : useCodebaseEnhancerPrompt;

  const toggleLocked = (val: boolean) => {
    if (activeType === 'system') onToggleCodebase(val);
    else if (activeType === 'enhancer') onToggleCodebaseEnhancer(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Settings size={20} className="text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Agent Configuration</h2>
              <p className="text-xs text-slate-400">Configure system instructions and API keys</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500 hover:text-slate-300" />
          </button>
        </div>

        {/* Prompt Selector (Only visible for Prompt Tabs) */}
        {activeTab !== 'keys' && activeTab !== 'prefs' && (
            <div className="px-5 pt-5 pb-0 flex items-center justify-center">
                <div className="bg-slate-800 p-1 rounded-xl flex shadow-inner border border-slate-700">
                    <button
                        onClick={() => setActiveType('system')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeType === 'system' ? 'bg-slate-700 text-primary shadow-sm ring-1 ring-primary/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <LayoutTemplate size={16} />
                        Main Agent
                    </button>
                    <button
                        onClick={() => setActiveType('enhancer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeType === 'enhancer' ? 'bg-slate-700 text-violet-400 shadow-sm ring-1 ring-violet-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Wand2 size={16} />
                        Gen Enhancer
                    </button>
                </div>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-5 mt-4 overflow-x-auto no-scrollbar">
           <button 
             onClick={() => setActiveTab('editor')}
             className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'editor' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
           >
             Editor
           </button>
           <button 
             onClick={() => setActiveTab('optimize')}
             className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'optimize' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
           >
             <Sparkles size={14} /> AI Optimizer
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
           >
             <History size={14} /> History
           </button>
           <button 
             onClick={() => setActiveTab('keys')}
             className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'keys' ? 'border-green-500 text-green-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
           >
             <Key size={14} /> API Keys
           </button>
           <button 
             onClick={() => setActiveTab('prefs')}
             className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'prefs' ? 'border-purple-500 text-purple-500' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
           >
             <Eye size={14} /> Preferences
           </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-0 bg-slate-950/50">
          
          {/* EDITOR TAB */}
          {activeTab === 'editor' && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                    <label className="block text-sm font-semibold text-slate-300">
                    {activeType === 'system' ? 'Main Chatbot Instructions' : 'Generation Enhancer Instructions'}
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Source:</span>
                        <button 
                            onClick={() => toggleLocked(true)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${isLocked ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                        >
                            <FileCode size={10} /> Codebase
                        </button>
                        <button 
                            onClick={() => toggleLocked(false)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${!isLocked ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                        >
                            <Database size={10} /> Custom DB
                        </button>
                    </div>
                </div>
                
                {!isLocked && (
                    <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Save Note:</span>
                    <input 
                        type="text" 
                        value={saveNote}
                        onChange={(e) => setSaveNote(e.target.value)}
                        placeholder="Optional description for history..."
                        className="text-xs border border-slate-700 bg-slate-800 text-slate-200 rounded px-2 py-1 w-64 focus:ring-1 focus:ring-primary outline-none placeholder-slate-600"
                    />
                    </div>
                )}
              </div>
              <div className="relative h-full min-h-[350px]">
                {isLocked && (
                    <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 text-center max-w-sm">
                            <FileCode size={32} className="mx-auto text-primary mb-2" />
                            <h3 className="font-bold text-slate-200">Hardcoded Mode Active</h3>
                            <p className="text-xs text-slate-400 mt-1 mb-3">
                                The prompt is currently using the hardcoded version from <code>constants.ts</code>.
                            </p>
                            <button 
                                onClick={() => toggleLocked(false)}
                                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                            >
                                Switch to Custom Mode to Edit
                            </button>
                        </div>
                    </div>
                )}
                <textarea
                  value={localPrompt}
                  readOnly={isLocked}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  className={`w-full h-full min-h-[350px] p-4 text-sm font-mono bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none leading-relaxed shadow-sm ${isLocked ? 'text-slate-500' : 'text-slate-200'}`}
                  spellCheck={false}
                  placeholder="Enter instructions here..."
                />
              </div>
            </div>
          )}

          {/* KEYS TAB */}
          {activeTab === 'keys' && (
            <div className="flex-1 overflow-y-auto p-8">
               <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2">
                       <Key size={20} className="text-green-500"/> Together AI Configuration
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                       Enter your Together AI API key to enable high-quality <strong>Seedream</strong> image generation.
                    </p>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                            Together AI Key (Required for Seedream)
                        </label>
                        <input 
                            type="password" 
                            value={togetherKey}
                            onChange={(e) => setTogetherKey(e.target.value)}
                            placeholder="tgp_v1_..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-green-500 outline-none font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Get your key from <a href="https://api.together.xyz/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">together.ai</a>. This key is stored locally in your browser.
                        </p>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                            OpenAI API Key (Required for OpenAI models)
                        </label>
                        <input 
                            type="password" 
                            value={openAiKey}
                            onChange={(e) => setOpenAiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">platform.openai.com</a>. This key is stored locally in your browser.
                        </p>
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* PREFS TAB */}
          {activeTab === 'prefs' && (
            <div className="flex-1 overflow-y-auto p-8">
               <div className="max-w-2xl mx-auto space-y-8">
                 
                 {/* Chat Model Section */}
                 <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2">
                       <Bot size={20} className="text-blue-500"/> Default Chat Model
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                       Select the AI model used for conversation and prompt generation.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                       <button 
                          onClick={() => setModelMode('gemini')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${modelMode === 'gemini' ? 'bg-blue-500/10 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Zap size={20} className={modelMode === 'gemini' ? 'text-blue-400' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">Gemini 3 Flash</div>
                                <div className="text-xs opacity-70">Google's fastest multimodal model</div>
                             </div>
                          </div>
                          {modelMode === 'gemini' && <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>}
                       </button>
                       
                       <button 
                          onClick={() => setModelMode('gemini-lite')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${modelMode === 'gemini-lite' ? 'bg-teal-500/10 border-teal-500/50 text-teal-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Feather size={20} className={modelMode === 'gemini-lite' ? 'text-teal-400' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">Gemini 3.1 Flash Lite</div>
                                <div className="text-xs opacity-70">Lightweight and cost-effective</div>
                             </div>
                          </div>
                          {modelMode === 'gemini-lite' && <div className="w-3 h-3 rounded-full bg-teal-500 shadow-lg shadow-teal-500/50"></div>}
                       </button>

                       <button 
                          onClick={() => setModelMode('gemini-pro')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${modelMode === 'gemini-pro' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Sparkles size={20} className={modelMode === 'gemini-pro' ? 'text-emerald-400' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">Gemini 3.1 Pro</div>
                                <div className="text-xs opacity-70">Most capable reasoning model</div>
                             </div>
                          </div>
                          {modelMode === 'gemini-pro' && <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>}
                       </button>

                       <button 
                          onClick={() => setModelMode('pollinations')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${modelMode === 'pollinations' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Sparkles size={20} className={modelMode === 'pollinations' ? 'text-primary' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">Pollinations (OpenAI/Turbo)</div>
                                <div className="text-xs opacity-70">Standard text generation</div>
                             </div>
                          </div>
                          {modelMode === 'pollinations' && <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50"></div>}
                       </button>

                       <button 
                          onClick={() => setModelMode('openai')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${modelMode === 'openai' ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Zap size={20} className={modelMode === 'openai' ? 'text-indigo-400' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">OpenAI (GPT-5.4 Nano)</div>
                                <div className="text-xs opacity-70">Requires OpenAI API Key</div>
                             </div>
                          </div>
                          {modelMode === 'openai' && <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50"></div>}
                       </button>

                       <button 
                          onClick={() => setModelMode('gemini-2.5-pro')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${modelMode === 'gemini-2.5-pro' ? 'bg-rose-500/10 border-rose-500/50 text-rose-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Zap size={20} className={modelMode === 'gemini-2.5-pro' ? 'text-rose-400' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">Gemini 2.5 Pro</div>
                                <div className="text-xs opacity-70">High-performance multimodal model</div>
                             </div>
                          </div>
                          {modelMode === 'gemini-2.5-pro' && <div className="w-3 h-3 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50"></div>}
                       </button>
                    </div>

                    {modelMode === 'pollinations' && (
                       <div className="mt-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                             Pollinations Text Model
                          </label>
                          <input 
                             type="text" 
                             value={pollinationsTextModel}
                             onChange={(e) => setPollinationsTextModel(e.target.value)}
                             placeholder="e.g. gemini-fast, openai, claude"
                             className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-primary outline-none font-mono"
                          />
                          <p className="text-xs text-slate-500 mt-2">
                             Specify the exact model name to request from Pollinations text endpoint.
                          </p>
                       </div>
                    )}
                 </div>

                 {/* Image Model Section */}
                 <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2">
                       <ImageIcon size={20} className="text-purple-500"/> Default Image Engine
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                       Select the engine used for generating and editing logos.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                       <button 
                          onClick={() => setImageModelMode('together-seedream')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${imageModelMode === 'together-seedream' ? 'bg-purple-500/10 border-purple-500/50 text-purple-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <Camera size={20} className={imageModelMode === 'together-seedream' ? 'text-purple-400' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">Together AI Seedream</div>
                                <div className="text-xs opacity-70">High-quality, consistent logo generation</div>
                             </div>
                          </div>
                          {imageModelMode === 'together-seedream' && <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50"></div>}
                       </button>

                       <button 
                          onClick={() => setImageModelMode('pollinations')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all ${imageModelMode === 'pollinations' ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}
                       >
                          <div className="flex items-center gap-3">
                             <ImageIcon size={20} className={imageModelMode === 'pollinations' ? 'text-primary' : 'text-slate-500'} />
                             <div className="text-left">
                                <div className="font-bold text-sm">Pollinations Standard</div>
                                <div className="text-xs opacity-70">Free, fast generation</div>
                             </div>
                          </div>
                          {imageModelMode === 'pollinations' && <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50"></div>}
                       </button>
                    </div>

                    {imageModelMode === 'pollinations' && (
                       <div className="mt-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                             Pollinations Image Model
                          </label>
                          <input 
                             type="text" 
                             value={pollinationsImageModel}
                             onChange={(e) => setPollinationsImageModel(e.target.value)}
                             placeholder="e.g. flux-2-dev, flux, turbo"
                             className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-200 focus:ring-2 focus:ring-primary outline-none font-mono"
                          />
                          <p className="text-xs text-slate-500 mt-2">
                             Specify the exact model name to request from Pollinations image endpoint.
                          </p>
                       </div>
                    )}
                 </div>
                 
                 {/* Display Settings */}
                 <div>
                    <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2">
                       <Eye size={20} className="text-slate-400"/> Interface
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                       Customize how the chat interface looks and behaves.
                    </p>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                        <div>
                           <label className="block text-sm font-bold text-slate-200">
                               Show Uploaded Attachments
                           </label>
                           <p className="text-xs text-slate-500 mt-1">
                               Toggle to enable image uploads and view previews in the chat. Off by default.
                           </p>
                        </div>
                        <button 
                            onClick={() => onToggleShowAttachments(!showAttachments)}
                            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary ${showAttachments ? 'bg-primary' : 'bg-slate-600'}`}
                        >
                            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showAttachments ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between mt-4">
                        <div>
                           <label className="block text-sm font-bold text-slate-200">
                               Enable Summary Mode
                           </label>
                           <p className="text-xs text-slate-500 mt-1">
                               Summarize past history after each image generation to save tokens.
                           </p>
                        </div>
                        <button 
                            onClick={() => onToggleSummaryMode(!isSummaryModeEnabled)}
                            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary ${isSummaryModeEnabled ? 'bg-primary' : 'bg-slate-600'}`}
                        >
                            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isSummaryModeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                 </div>

               </div>
            </div>
          )}

          {/* OPTIMIZE TAB */}
          {activeTab === 'optimize' && (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto">
                 <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4 mb-6">
                    <h3 className="text-amber-500 font-bold flex items-center gap-2 mb-2">
                      <Sparkles size={18} /> Prepare Optimization Prompt
                    </h3>
                    <p className="text-sm text-amber-200/80 leading-relaxed">
                      Describe the issue you are facing with the <strong>{activeType === 'system' ? 'Main Agent' : 'Gen Enhancer'}</strong>. We will construct a structured context prompt containing your instructions and logs.
                    </p>
                 </div>

                 <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">
                        What's wrong with the current behavior?
                      </label>
                      <textarea 
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="E.g. The agent is ignoring my formatting rules..."
                        className="w-full h-24 p-4 text-sm bg-slate-800 border border-slate-700 text-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none shadow-sm placeholder-slate-600"
                      />
                    </div>

                    <div className="bg-slate-800 rounded-lg p-4 text-xs text-slate-400 border border-slate-700">
                       <p className="font-semibold mb-1 flex items-center gap-1 text-slate-300"><MessageSquareWarning size={14}/> Context that will be included:</p>
                       <ul className="list-disc pl-5 space-y-1">
                          <li>Current {activeType} Prompt ({localPrompt.length} chars)</li>
                          <li>Last {Math.min(logs.length, 5)} request/response logs</li>
                       </ul>
                    </div>

                    <button
                      onClick={handleGeneratePrompt}
                      disabled={!issueDescription.trim()}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md
                        ${!issueDescription.trim()
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' 
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:scale-[1.02] active:scale-[0.98]'
                        }
                      `}
                    >
                      <FileText size={20} />
                      Generate Structured Prompt for External AI
                    </button>

                    {generatedPrompt && (
                      <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-slate-300">
                            Generated Meta-Prompt
                          </label>
                          <button 
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-900/30 text-green-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                          >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                          </button>
                        </div>
                        <div className="relative">
                          <textarea 
                            readOnly
                            value={generatedPrompt}
                            className="w-full h-64 p-4 text-xs font-mono bg-slate-950 text-slate-400 border border-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none shadow-inner"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                          Copy the text above and paste it into ChatGPT, Claude, or Gemini to get an optimized prompt.
                        </p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-3 max-w-3xl mx-auto">
                <div className="text-center mb-4">
                    <span className="inline-block px-3 py-1 bg-slate-800 text-slate-400 text-xs font-semibold rounded-full border border-slate-700">
                        History for: {activeType === 'system' ? 'Main Agent' : 'Gen Enhancer'}
                    </span>
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <HardDrive size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No version history available.</p>
                  </div>
                ) : (
                  history.map((ver) => (
                    <div key={ver.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-slate-600 transition-all flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className={`mt-1 p-2 rounded-lg ${ver.source === 'ai' ? 'bg-amber-900/30 text-amber-500' : ver.source === 'system' ? 'bg-slate-700 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                           {ver.source === 'ai' ? <Bot size={20} /> : ver.source === 'system' ? <Settings size={20} /> : <User size={20} />}
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-bold text-slate-200 text-sm">{ver.note || "No description"}</h4>
                             <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded-full text-slate-400 border border-slate-600">
                               {new Date(ver.timestamp).toLocaleString()}
                             </span>
                           </div>
                           <p className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded border border-slate-700 line-clamp-2 max-w-md">
                             {ver.content.substring(0, 150)}...
                           </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRestore(ver)}
                        className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex justify-between items-center bg-slate-900 rounded-b-2xl">
          <button 
            onClick={() => {
              onReset(activeType);
              setActiveTab('editor');
            }}
            disabled={isLocked}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isLocked ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-red-400 hover:bg-red-900/20'}`}
          >
            <RotateCcw size={16} /> Reset Default
          </button>
          <div className="flex gap-3">
             <button 
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveChanges}
              disabled={isLocked && activeTab !== 'keys' && activeTab !== 'prefs'}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors font-medium shadow-sm duration-200 ${isLocked && activeTab !== 'keys' && activeTab !== 'prefs' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-primary text-slate-950 hover:opacity-90 hover:shadow active:scale-95'}`}
            >
              <Save size={18} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;