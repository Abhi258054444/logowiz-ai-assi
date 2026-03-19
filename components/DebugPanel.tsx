import React, { useState } from 'react';
import { X, Trash2, ChevronRight, ChevronDown, Activity, Clock, Database, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { NetworkLogItem } from '../types';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  logs: NetworkLogItem[];
  onClearLogs: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose, logs, onClearLogs }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[60] w-full md:w-[600px] bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-100">Network Inspector</h2>
            <p className="text-xs text-slate-500">{logs.length} requests recorded</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onClearLogs}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Clear Logs"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Database size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">No requests recorded yet</p>
          </div>
        ) : (
          [...logs].reverse().map((log) => (
            <div key={log.id} className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
              {/* Summary Row */}
              <div 
                onClick={() => toggleExpand(log.id)}
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-800 transition-colors ${expandedId === log.id ? 'bg-slate-800 border-b border-slate-700' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-10 rounded-full ${log.responseStatus >= 200 && log.responseStatus < 300 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">{log.method}</span>
                      <span className="text-sm font-semibold text-slate-200 truncate max-w-[180px]" title={log.url}>{log.url.replace('https://', '')}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <Clock size={10} />
                        {formatTime(log.timestamp)}
                      </div>
                      <div className={`text-[10px] font-bold ${log.responseStatus >= 200 && log.responseStatus < 300 ? 'text-green-400' : 'text-red-400'}`}>
                        {log.responseStatus}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {log.duration}ms
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-slate-500">
                  {expandedId === log.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              {/* Details Pane */}
              {expandedId === log.id && (
                <div className="bg-slate-950/50 p-0 text-xs font-mono">
                  {/* Request */}
                  <div className="border-b border-slate-800">
                    <div className="px-4 py-2 bg-slate-800/50 text-slate-400 font-bold flex items-center gap-2">
                      <ArrowUpCircle size={14} className="text-blue-400" /> Request Payload
                    </div>
                    <div className="p-3 max-h-[300px] overflow-auto">
                      <pre className="whitespace-pre-wrap break-all text-slate-400">
                        {JSON.stringify(log.requestBody, null, 2)}
                      </pre>
                    </div>
                  </div>
                  
                  {/* Response */}
                  <div>
                    <div className="px-4 py-2 bg-slate-800/50 text-slate-400 font-bold flex items-center gap-2">
                      <ArrowDownCircle size={14} className="text-green-400" /> Response Body
                    </div>
                    <div className="p-3 max-h-[300px] overflow-auto">
                      <pre className="whitespace-pre-wrap break-all text-slate-400">
                        {JSON.stringify(log.responseBody, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugPanel;