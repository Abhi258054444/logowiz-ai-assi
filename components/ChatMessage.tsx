import React, { useState } from 'react';
import { Message, FlyerQuestion, FlyerQuestionToolCall } from '../types';
import { Bot, User, Download, ExternalLink, Image as ImageIcon, CheckCircle2, Circle, Square, CheckSquare, SkipForward, Send, HelpCircle, UploadCloud, X } from 'lucide-react';
import { uploadImage } from '../services/uploadService';

// Category display config
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  event_details: { label: 'Event Details', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  design_style: { label: 'Design Style', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  content_text: { label: 'Content', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  branding: { label: 'Branding', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  other: { label: 'Other', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

// --- Question Card Sub-Component ---
interface QuestionCardProps {
  question: FlyerQuestion;
  answer: string | string[];
  isSkipped: boolean;
  isDisabled: boolean;
  onAnswer: (value: string | string[]) => void;
  onSkip: () => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, answer, isSkipped, isDisabled, onAnswer, onSkip }) => {
  const category = CATEGORY_CONFIG[question.category || 'other'] || CATEGORY_CONFIG.other;
  const isRequired = question.required !== false; // Default to true if not specified

  const selectedArray = Array.isArray(answer) ? answer : [];
  const singleAnswer = typeof answer === 'string' ? answer : '';
  
  // Custom answer detection for "Other" field
  const customValueMulti = selectedArray.find(a => !question.options?.some(opt => opt.id === a)) || '';
  const isCustomSingle = singleAnswer !== '' && !question.options?.some(opt => opt.id === singleAnswer);
  const customValueSingle = isCustomSingle ? singleAnswer : '';
  const customValue = question.type === 'multi_select' ? customValueMulti : customValueSingle;

  const handleCustomChange = (val: string) => {
    if (question.type === 'multi_select') {
      const nonCustom = selectedArray.filter(a => question.options?.some(opt => opt.id === a));
      if (val.trim() === '') onAnswer(nonCustom);
      else {
        if (question.max_select && nonCustom.length >= question.max_select) return;
        onAnswer([...nonCustom, val]);
      }
    } else {
      onAnswer(val);
    }
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      isSkipped 
        ? 'border-slate-700/50 bg-slate-800/30 opacity-60' 
        : isDisabled
          ? 'border-slate-700/50 bg-slate-800/50'
          : 'border-slate-700 bg-slate-800/80 hover:border-slate-600'
    }`}>
      {/* Question Header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${category.color}`}>
              {category.label}
            </span>
            {isRequired ? (
              <span className="text-[10px] font-medium text-rose-400">Required</span>
            ) : (
              <span className="text-[10px] font-medium text-slate-500">Optional</span>
            )}
            {question.type === 'multi_select' && question.max_select && (
              <span className="text-[10px] font-medium text-slate-500">Max: {question.max_select}</span>
            )}
          </div>
          <p className={`text-sm font-medium ${isSkipped ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
            {question.question}
          </p>
          {question.why_asking && (
            <p className="text-[11px] text-slate-400 mt-1 italic">
              {question.why_asking}
            </p>
          )}
        </div>
        {!isDisabled && !isSkipped && (
          <button
            onClick={onSkip}
            className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-700/50"
            title="Skip this question"
          >
            <SkipForward size={12} />
            Skip
          </button>
        )}
        {isSkipped && (
          <span className="flex-shrink-0 text-xs text-slate-500 italic">Skipped</span>
        )}
      </div>

      {/* Answer Area */}
      {!isSkipped && (
        <div className="px-4 pb-3">
          {/* Single Select — Radio Buttons */}
          {question.type === 'single_select' && question.options && (
            <div className="flex flex-col gap-1.5">
              {question.options.map((option, idx) => {
                const isSelected = singleAnswer === option.id;
                return (
                  <button
                    key={idx}
                    disabled={isDisabled}
                    onClick={() => onAnswer(option.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary/15 border border-primary/40 text-primary'
                        : isDisabled
                          ? 'bg-slate-800/50 border border-slate-700/30 text-slate-400'
                          : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-700/50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={16} className="flex-shrink-0 text-primary" />
                    ) : (
                      <Circle size={16} className="flex-shrink-0 text-slate-500" />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Multi Select — Checkboxes */}
          {question.type === 'multi_select' && question.options && (
            <div className="flex flex-col gap-1.5">
              {question.options.map((option, idx) => {
                const isSelected = selectedArray.includes(option.id);
                return (
                  <button
                    key={idx}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isSelected) {
                        onAnswer(selectedArray.filter(a => a !== option.id));
                      } else {
                        if (question.max_select && selectedArray.length >= question.max_select) return;
                        onAnswer([...selectedArray, option.id]);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary/15 border border-primary/40 text-primary'
                        : isDisabled
                          ? 'bg-slate-800/50 border border-slate-700/30 text-slate-400'
                          : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:border-slate-600 hover:bg-slate-700/50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="flex-shrink-0 text-primary" />
                    ) : (
                      <Square size={16} className="flex-shrink-0 text-slate-500" />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Allow Other Input */}
          {(question.type === 'single_select' || question.type === 'multi_select') && question.allow_other && (
             <div className="mt-2">
                <input
                  type="text"
                  disabled={isDisabled}
                  value={customValue}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder={question.other_placeholder || "Other..."}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all duration-150 outline-none ${
                    isDisabled
                      ? 'bg-slate-800/50 border-slate-700/30 text-slate-400 placeholder-slate-600'
                      : customValue !== ''
                        ? 'bg-primary/5 border-primary/30 text-slate-200 placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/20'
                        : 'bg-slate-800/80 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/20'
                  }`}
                />
             </div>
          )}

          {/* Text Input (Short Answer) */}
          {question.type === 'short_answer' && (
            <input
              type="text"
              disabled={isDisabled}
              value={singleAnswer}
              onChange={(e) => onAnswer(e.target.value)}
              placeholder={question.placeholder || "Type your answer..."}
              className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-all duration-150 outline-none ${
                isDisabled
                  ? 'bg-slate-800/50 border-slate-700/30 text-slate-400 placeholder-slate-600'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/20'
              }`}
            />
          )}

          {/* Image Upload Input */}
          {question.type === 'image_upload' && (
            <div className="mt-2 relative">
              {singleAnswer && singleAnswer.startsWith('{') ? (
                <div className="relative inline-block">
                  <img src={JSON.parse(singleAnswer).url} alt="Uploaded preview" className="h-24 w-auto rounded-lg border border-slate-700 object-cover" />
                  {!isDisabled && (
                    <button 
                      onClick={() => onAnswer('')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ) : singleAnswer === 'uploading' ? (
                <div className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-700 bg-slate-800/50 rounded-lg">
                   <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2"></div>
                   <p className="text-xs text-slate-400 font-medium">Uploading...</p>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDisabled 
                    ? 'border-slate-700/50 bg-slate-800/30 text-slate-500 cursor-not-allowed' 
                    : 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-500 text-slate-400'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-6 h-6 mb-2 text-slate-400" />
                    <p className="text-xs font-medium">Click to upload image</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    disabled={isDisabled}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          onAnswer('uploading');
                          
                          // Get base64 for Gemini Vision
                          const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = error => reject(error);
                          });
                          
                          // Get URL for Pollinations
                          const url = await uploadImage(file);
                          
                          // Store both in answer as JSON
                          onAnswer(JSON.stringify({ url, base64 }));
                        } catch (err) {
                          alert("Failed to upload image.");
                          onAnswer('');
                        }
                      }
                    }} 
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main ChatMessage Component ---
interface ChatMessageProps {
  message: Message;
  showAttachments?: boolean;
  onQuestionSubmit?: (answers: Record<string, string | string[]>) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, showAttachments = false, onQuestionSubmit }) => {
  // If message is marked as hidden (e.g. internal Tool JSON), don't render it
  if (message.isHidden) return null;

  // Determine if this is a "User" message for UI purposes
  // It is a user message IF:
  // 1. role is 'user'
  // 2. AND it is NOT a generated image (which has imageUrl property)
  // Note: We changed generated image role to 'user' for API context, but UI should show as assistant/tool output
  const isUser = message.role === 'user' && !message.imageUrl;
  
  const isImage = message.type === 'image';
  const isQuestions = message.type === 'questions';
  const [imgLoaded, setImgLoaded] = useState(false);

  // Question state management
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleSetAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Remove from skipped if user starts answering
    setSkippedQuestions(prev => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleSkipQuestion = (questionId: string) => {
    setSkippedQuestions(prev => new Set(prev).add(questionId));
    // Clear any existing answer
    setAnswers(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    
    // Auto-advance
    if (message.questionData && currentQuestionIndex < message.questionData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSkipAll = () => {
    if (!message.questionData) return;
    const allIds = new Set(message.questionData.questions.map(q => q.id));
    setSkippedQuestions(allIds);
    setAnswers({});
    // Submit with all skipped
    if (onQuestionSubmit) {
      const emptyAnswers: Record<string, string | string[]> = {};
      message.questionData.questions.forEach(q => {
        emptyAnswers[q.id] = '';
      });
      onQuestionSubmit(emptyAnswers);
    }
  };

  const handleSubmit = () => {
    if (!message.questionData || !onQuestionSubmit) return;
    // Build final answers — include skipped as empty
    const finalAnswers: Record<string, string | string[]> = {};
    message.questionData.questions.forEach(q => {
      if (skippedQuestions.has(q.id)) {
        finalAnswers[q.id] = '';
      } else {
        finalAnswers[q.id] = answers[q.id] || '';
      }
    });
    onQuestionSubmit(finalAnswers);
  };

  // --- Render Question Cards ---
  if (isQuestions && message.questionData) {
    const isDisabled = message.isQuestionAnswered === true;
    const questionData = message.questionData;
    const currentQuestion = questionData.questions[currentQuestionIndex];

    return (
      <div className="flex w-full mb-6 justify-start">
        <div className="flex max-w-[90%] md:max-w-[80%] gap-3 flex-row">
          {/* Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-green-600 text-white shadow-sm">
            <Bot size={16} />
          </div>

          {/* Question Container */}
          <div className="flex flex-col items-start flex-1 min-w-0">
            {/* Context Summary */}
            {questionData.context_summary && (
              <div className="px-4 py-3 mb-3 rounded-2xl rounded-bl-none bg-slate-900 border border-slate-800 text-sm text-slate-200 leading-relaxed">
                {questionData.context_summary}
              </div>
            )}

            {/* Questions Card */}
            <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-700 overflow-hidden shadow-lg">
              {/* Card Header */}
              <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700/80 flex items-center gap-2">
                <HelpCircle size={16} className="text-primary" />
                <span className="text-sm font-semibold text-slate-200">
                  {isDisabled 
                    ? 'Questions Answered' 
                    : `Question ${currentQuestionIndex + 1} of ${questionData.questions.length}`}
                </span>
                {isDisabled && (
                  <CheckCircle2 size={14} className="text-green-400 ml-auto" />
                )}
              </div>

              {/* Question List */}
              <div className="p-3 flex flex-col gap-2.5">
                {isDisabled ? (
                  // Show all answered questions as a summary
                  questionData.questions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      answer={answers[q.id] || (q.type === 'multi_select' ? [] : '')}
                      isSkipped={skippedQuestions.has(q.id)}
                      isDisabled={isDisabled}
                      onAnswer={(value) => handleSetAnswer(q.id, value)}
                      onSkip={() => handleSkipQuestion(q.id)}
                    />
                  ))
                ) : (
                  // Show only current question
                  currentQuestion && (
                    <QuestionCard
                      key={currentQuestion.id}
                      question={currentQuestion}
                      answer={answers[currentQuestion.id] || (currentQuestion.type === 'multi_select' ? [] : '')}
                      isSkipped={skippedQuestions.has(currentQuestion.id)}
                      isDisabled={isDisabled}
                      onAnswer={(value) => handleSetAnswer(currentQuestion.id, value)}
                      onSkip={() => handleSkipQuestion(currentQuestion.id)}
                    />
                  )
                )}
              </div>

              {/* Action Buttons */}
              {!isDisabled && (
                <div className="px-4 py-3 bg-slate-800/40 border-t border-slate-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {currentQuestionIndex > 0 && (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50"
                      >
                        Back
                      </button>
                    )}
                    <button
                      onClick={handleSkipAll}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-700/50"
                    >
                      <SkipForward size={14} />
                      Skip All
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (currentQuestionIndex < questionData.questions.length - 1) {
                        setCurrentQuestionIndex(prev => prev + 1);
                      } else {
                        handleSubmit();
                      }
                    }}
                    className="text-sm font-semibold text-slate-950 bg-primary hover:bg-primary/90 transition-all duration-150 flex items-center gap-2 px-5 py-2 rounded-xl shadow-md hover:shadow-lg"
                  >
                    {currentQuestionIndex < questionData.questions.length - 1 ? (
                      <>Next</>
                    ) : (
                      <><Send size={14} /> Submit</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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