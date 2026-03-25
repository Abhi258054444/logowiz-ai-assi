import React from 'react';
import Logo from './Logo';
import { Sparkles, Zap, Feather, Image as ImageIcon, Camera, Cpu, Trash2, Activity, Settings, X } from 'lucide-react';
import { ModelMode, ImageModelMode, NetworkLogItem } from '../types';
import { formatCurrency } from '../services/pricingService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  modelMode: ModelMode;
  setModelMode: (mode: ModelMode) => void;
  enhancerModelMode: ModelMode;
  setEnhancerModelMode: (mode: ModelMode) => void;
  imageModelMode: ImageModelMode;
  setImageModelMode: (mode: ImageModelMode) => void;
  togetherApiKey: string;
  onOpenSettings: () => void;
  totalTokens: number;
  totalCost: number;
  onClearChat: () => void;
  onOpenDebug: () => void;
  debugLogCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  modelMode,
  setModelMode,
  enhancerModelMode,
  setEnhancerModelMode,
  imageModelMode,
  setImageModelMode,
  togetherApiKey,
  onOpenSettings,
  totalTokens,
  totalCost,
  onClearChat,
  onOpenDebug,
  debugLogCount
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div className={`fixed md:relative inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <Logo />
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          
          {/* Main AI Model Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Main AI Model</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setModelMode('pollinations')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${modelMode === 'pollinations' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Sparkles size={16} />
                Pollinations
              </button>
              <button 
                onClick={() => setModelMode('openai')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${modelMode === 'openai' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Zap size={16} />
                OpenAI (GPT-5.4 Nano)
              </button>
              <button 
                onClick={() => setModelMode('gemini-2.5-pro')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${modelMode === 'gemini-2.5-pro' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Zap size={16} />
                Gemini 2.5 Pro
              </button>
              <button 
                onClick={() => setModelMode('gemini-2.5-flash')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${modelMode === 'gemini-2.5-flash' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Zap size={16} />
                Gemini 2.5 Flash
              </button>
            </div>
          </div>

          {/* Enhancer AI Model Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Enhancer AI Model</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setEnhancerModelMode('pollinations')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${enhancerModelMode === 'pollinations' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Sparkles size={16} />
                Pollinations
              </button>
              <button 
                onClick={() => setEnhancerModelMode('openai')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${enhancerModelMode === 'openai' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Zap size={16} />
                OpenAI (GPT-5.4 Nano)
              </button>
              <button 
                onClick={() => setEnhancerModelMode('gemini-2.5-pro')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${enhancerModelMode === 'gemini-2.5-pro' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Zap size={16} />
                Gemini 2.5 Pro
              </button>
              <button 
                onClick={() => setEnhancerModelMode('gemini-2.5-flash')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${enhancerModelMode === 'gemini-2.5-flash' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Zap size={16} />
                Gemini 2.5 Flash
              </button>
            </div>
          </div>

          {/* Image Engine Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
              Image Engine <ImageIcon size={12}/>
            </h3>
            <div className="space-y-2">
              <button 
                onClick={() => setImageModelMode('pollinations')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${imageModelMode === 'pollinations' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <span className="flex items-center gap-3">
                    <ImageIcon size={16} /> Standard
                </span>
                {imageModelMode === 'pollinations' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
              </button>
              
              <button 
                onClick={() => {
                    if (!togetherApiKey) onOpenSettings();
                    setImageModelMode('together-seedream');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${imageModelMode === 'together-seedream' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <span className="flex items-center gap-3">
                    <Camera size={16} /> Together AI
                </span>
                {imageModelMode === 'together-seedream' ? (
                     <div className="w-2 h-2 rounded-full bg-green-500"></div>
                ) : !togetherApiKey && (
                     <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">Set Key</span>
                )}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
             <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Cpu size={14} />
                <span className="text-xs font-semibold uppercase">Token Usage</span>
             </div>
             <div className="text-2xl font-mono text-primary font-medium truncate">
                {totalTokens.toLocaleString()}
             </div>
             <div className="text-[10px] text-slate-600 mt-1">
                Est. prompt + history
             </div>
          </div>

          {/* Pricing Stats */}
          <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
             <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Zap size={14} className="text-blue-400" />
                <span className="text-xs font-semibold uppercase">Est. Live Cost</span>
             </div>
             <div className="text-2xl font-mono text-blue-400 font-medium truncate">
                {formatCurrency(totalCost)}
             </div>
             <div className="text-[10px] text-slate-600 mt-1">
                Gemini Tokens + Together AI
             </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-900">
           <button 
              onClick={onClearChat}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-colors"
           >
              <Trash2 size={16} /> Clear Conversation
           </button>
           
           <button 
              onClick={onOpenDebug}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${debugLogCount > 0 ? 'text-primary' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
           >
              <Activity size={16} /> Network Logs
              {debugLogCount > 0 && <span className="ml-auto bg-primary text-slate-950 text-[10px] font-bold px-1.5 rounded-full">{debugLogCount}</span>}
           </button>

           <button 
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
           >
              <Settings size={16} /> Settings & Keys
           </button>
        </div>

      </div>
    </>
  );
};

export default Sidebar;