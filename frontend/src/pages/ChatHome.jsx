import { useState, useRef, useEffect } from 'react';
import {
  Send, Upload, Copy, Check, RotateCcw, Trash2,
  BookOpen, AlertTriangle, Loader2, MessageSquare, Menu,
  Lightbulb, HelpCircle, Layers, FileText, Bookmark, Sparkles, ListChecks,
  FileCheck2, X, Pencil, Sun, Moon
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import ScienceLogo from '../components/ScienceLogo';
import SourcePanel from '../components/SourcePanel';
import AttachmentMenu from '../components/AttachmentMenu';
import CameraModal from '../components/CameraModal';

const SUGGESTED_QUESTIONS = [
  'What is a chemical reaction? Explain with two everyday examples.',
  'Why does the colour of copper sulphate solution change when iron is dipped in it?',
  'Explain the process of respiration and write its chemical equation.',
  'How do acids and bases react with metals? Give an example.',
  'What is Ohm’s law and how is resistance affected by wire length?',
  'Explain how reflex actions work in the human body.',
];

const DAILY_TIPS = [
  'Tip: Always write balanced chemical equations with physical states like (s), (l), (g), and (aq) for full marks.',
  'Tip: In Physics numericals, convert all quantities to SI units (metres, seconds, amperes, ohms) before substituting values.',
  'Tip: Practice drawing neat, labelled diagrams for the human heart, nephron, and reflex arc — they make answers clearer.',
  'Tip: Remember the reactivity series of metals to predict displacement reactions accurately.',
  'Tip: Use the mirror and lens sign conventions carefully: distances measured against incident light are negative.',
  'Tip: Group similar concepts into comparison tables (like arteries vs veins, or metals vs non-metals) for quick revision.',
];

const DAILY_TIP = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];

function FormattedAnswer({ text }) {
  if (!text) return null;

  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-[15px] sm:text-[16px] leading-[1.7] text-forest dark:text-[#F1F3EE] font-normal font-sans">
      {blocks.map((block, bIdx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const code = block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
          return (
            <div key={bIdx} className="my-2.5 rounded-xl overflow-hidden border border-cream-400 dark:border-[#3B473E] bg-[#F4EFE6] dark:bg-[#1A221D] shadow-xs">
              <pre className="p-3.5 text-xs font-mono font-medium overflow-x-auto text-forest dark:text-[#E2E8E0] leading-relaxed">
                {code}
              </pre>
            </div>
          );
        }

        const lines = block.split('\n');
        return (
          <div key={bIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1.5" />;

              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="text-[17px] sm:text-[18px] font-bold text-forest dark:text-[#F1F3EE] pt-2 font-heading tracking-tight">
                    {renderInline(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lIdx} className="text-[20px] sm:text-[22px] font-bold text-forest dark:text-[#F1F3EE] pt-2.5 font-heading tracking-tight">
                    {renderInline(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <h2 key={lIdx} className="text-[24px] sm:text-[26px] font-extrabold text-forest dark:text-[#F1F3EE] pt-3 font-heading tracking-tight">
                    {renderInline(trimmed.slice(2))}
                  </h2>
                );
              }

              // Highlight Definition / Key Concept / Formula / Law / Takeaway prefixes
              const defMatch = trimmed.match(/^(\s*(?:Definition|Key Point|Key Points|Key Concept|Formula|Law|Important|Note|Example|Chemical Reaction|Reaction|Equation|Takeaway|Rule|Explanation)\s*:)(.*)$/i);
              if (defMatch) {
                return (
                  <p key={lIdx} className="leading-[1.7]">
                    <strong className="font-bold text-forest dark:text-[#F9FAF8] tracking-tight">
                      {defMatch[1]}
                    </strong>{' '}
                    {renderInline(defMatch[2])}
                  </p>
                );
              }

              if (/^[-*•]\s+/.test(trimmed)) {
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-1.5">
                    <span className="text-sage-dark dark:text-[#9BB99A] font-extrabold mt-1 text-base leading-none select-none">•</span>
                    <span className="flex-1 leading-[1.7]">{renderInline(trimmed.replace(/^[-*•]\s+/, ''))}</span>
                  </div>
                );
              }

              const numMatch = trimmed.match(/^(\d+[.)])\s+(.*)$/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-1.5">
                    <span className="text-forest dark:text-[#9BB99A] font-bold text-xs sm:text-sm mt-0.5 min-w-[1.4rem] select-none">
                      {numMatch[1]}
                    </span>
                    <span className="flex-1 leading-[1.7]">{renderInline(numMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lIdx} className="leading-[1.7]">{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInline(text) {
  // Support **bold**, `code/formula`, and $math/formula$
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$(?:[^\$\n]+)\$)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-forest dark:text-[#F9FAF8] tracking-tight">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="font-mono font-semibold text-[13px] bg-cream-200 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] px-1.5 py-0.5 rounded text-forest dark:text-[#E2E8E0] shadow-2xs"
        >
          {inner}
        </code>
      );
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const inner = part.slice(1, -1);
      return (
        <span
          key={idx}
          className="font-mono font-semibold text-[13px] bg-cream-200/90 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] px-1.5 py-0.5 rounded text-forest dark:text-[#E2E8E0]"
        >
          {inner}
        </span>
      );
    }
    return part;
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-3xl mx-auto w-full">
      <ScienceLogo size="sm" />
      <div className="bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
        <div className="flex items-center gap-2 text-xs text-warm-grey dark:text-[#8E9B90]">
          <span>Searching NCERT textbook & preparing explanation</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-sage dark:bg-[#9BB99A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-sage dark:bg-[#9BB99A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-sage dark:bg-[#9BB99A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({
  msg,
  msgIndex,
  userQuestion,
  isLastAssistant,
  sending,
  isSaved,
  onLearningAction,
  onGenerateQuiz,
  onSaveAnswer,
  onRegenerate,
  onSaveEdit,
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content || '');
  const isUser = msg.role === 'user';

  const handleCopy = () => {
    if (!msg.content) return;
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleStartEdit = () => {
    setEditText(msg.content || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditText(msg.content || '');
    setIsEditing(false);
  };

  const handleConfirmEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msg.content) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    onSaveEdit(msgIndex, trimmed);
  };

  if (isUser) {
    return (
      <div className="group flex justify-end max-w-3xl mx-auto w-full items-start gap-2">
        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            disabled={sending}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-warm-grey dark:text-[#8E9B90] hover:text-forest dark:hover:text-[#F1F3EE] hover:bg-cream-200 dark:hover:bg-[#252F29] mt-1"
            title="Edit question"
            aria-label="Edit question"
          >
            <Pencil size={13} />
          </button>
        )}

        <div className="max-w-[82%] sm:max-w-[75%]">
          {isEditing ? (
            <div className="bg-cream-100 dark:bg-[#252F29] border border-sage rounded-2xl p-3 shadow-card space-y-2 text-forest dark:text-[#F1F3EE]">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleConfirmEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                rows={3}
                className="w-full bg-transparent text-sm text-forest dark:text-[#F1F3EE] resize-none focus:outline-none leading-relaxed"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-cream-300 dark:border-[#3B473E] text-xs">
                <span className="text-[10px] text-warm-grey dark:text-[#8E9B90]">
                  Enter to save · Esc to cancel
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-2.5 py-1 rounded-lg text-xs bg-cream-200 dark:bg-[#303B33] text-forest dark:text-[#F1F3EE] hover:bg-cream-300 dark:hover:bg-[#3B473E] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmEdit}
                    disabled={!editText.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-forest dark:bg-[#9BB99A] text-cream-100 dark:text-[#171C19] hover:bg-forest-light dark:hover:bg-[#85A884] transition-colors disabled:opacity-40"
                  >
                    Save & Resubmit
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-forest dark:bg-[#303B33] text-cream-100 dark:text-[#F1F3EE] text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap font-medium">
              {msg.image && (
                <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-w-sm bg-black/20">
                  <img
                    src={msg.image}
                    alt={msg.imageName || 'Attached science image'}
                    className="w-full max-h-56 object-contain"
                  />
                </div>
              )}
              {msg.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 max-w-3xl mx-auto w-full">
      <div className="w-8 h-8 rounded-full bg-sage/20 dark:bg-[#9BB99A]/20 border border-sage/30 dark:border-[#9BB99A]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <BookOpen size={14} className="text-sage-dark dark:text-[#9BB99A]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-card">
          {msg.error ? (
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-400">{msg.error}</p>
                {msg.content && <p className="text-xs text-warm-grey dark:text-[#8E9B90]">{msg.content}</p>}
              </div>
            </div>
          ) : (
            <FormattedAnswer text={msg.content} />
          )}
        </div>

        {/* All 8 Response Actions */}
        {!msg.error && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={sending}
                onClick={() => onLearningAction(`Explain this in very simple words for a Class 10 student: ${userQuestion || msg.content.slice(0, 120)}`)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-forest dark:text-[#F1F3EE] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
              >
                <Sparkles size={11} className="text-sage-dark dark:text-[#9BB99A]" />
                <span>Explain in Simple Words</span>
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={() => onLearningAction(`Give a clear real-life or textbook example for: ${userQuestion || msg.content.slice(0, 120)}`)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-forest dark:text-[#F1F3EE] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
              >
                <Lightbulb size={11} className="text-sage-dark dark:text-[#9BB99A]" />
                <span>Give an Example</span>
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={() => onLearningAction(`Summarize this topic briefly in 3-4 lines: ${userQuestion || msg.content.slice(0, 120)}`)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-forest dark:text-[#F1F3EE] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
              >
                <FileCheck2 size={11} className="text-sage-dark dark:text-[#9BB99A]" />
                <span>Summarize</span>
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={() => onLearningAction(`List the most important exam points for: ${userQuestion || msg.content.slice(0, 120)}`)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-forest dark:text-[#F1F3EE] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
              >
                <ListChecks size={11} className="text-sage-dark dark:text-[#9BB99A]" />
                <span>Important Points</span>
              </button>

              <button
                type="button"
                disabled={sending}
                onClick={() => onGenerateQuiz(userQuestion || msg.content.slice(0, 120))}
                className="inline-flex items-center gap-1 text-[11px] bg-sage/15 dark:bg-[#9BB99A]/15 hover:bg-sage/25 dark:hover:bg-[#9BB99A]/25 border border-sage/35 dark:border-[#9BB99A]/35 text-forest dark:text-[#F1F3EE] font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
              >
                <HelpCircle size={11} className="text-sage-dark dark:text-[#9BB99A]" />
                <span>Generate Quiz</span>
              </button>

              <button
                type="button"
                onClick={onSaveAnswer}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold border px-2.5 py-1 rounded-lg transition-colors ${isSaved
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border-cream-400 dark:border-[#3B473E] text-warm-grey dark:text-[#A7B2A9] hover:text-forest dark:hover:text-[#F1F3EE]'
                  }`}
              >
                <Bookmark size={11} />
                {isSaved ? 'Saved' : 'Save Answer'}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-warm-grey dark:text-[#A7B2A9] hover:text-forest dark:hover:text-[#F1F3EE] px-2.5 py-1 rounded-lg transition-colors"
              >
                {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              {isLastAssistant && onRegenerate && (
                <button
                  type="button"
                  disabled={sending}
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1 text-[11px] bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-warm-grey dark:text-[#A7B2A9] hover:text-forest dark:hover:text-[#F1F3EE] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                >
                  <RotateCcw size={11} />
                  Regenerate
                </button>
              )}

              {msg.elapsed != null && (
                <span className="text-[10px] text-warm-beige dark:text-[#6C7B70] ml-auto">
                  {msg.elapsed.toFixed(1)}s
                </span>
              )}
            </div>

            {/* Follow-up suggestions on the latest assistant message */}
            {isLastAssistant && !sending && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-warm-grey dark:text-[#8E9B90] uppercase tracking-wider mr-1">
                  Follow-up:
                </span>
                {[
                  `What common exam question is asked on this topic?`,
                  `What is the key formula or equation here?`,
                ].map((followUp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onLearningAction(`${followUp} (Topic: ${userQuestion || msg.content.slice(0, 80)})`)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-cream-200 dark:bg-[#303B33] hover:bg-cream-300 dark:hover:bg-[#3B473E] border border-cream-400 dark:border-[#3B473E] text-forest dark:text-[#F1F3EE] transition-colors"
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Textbook Sources */}
        <SourcePanel chunks={msg.rag?.chunks} />
      </div>
    </div>
  );
}

export default function ChatHome({ onOpenMobileSidebar }) {
  const {
    status,
    addLog,
    incrementQuestions,
    setCurrentPage,
    setUploadModalOpen,
    setPendingUploadFile,
    activeConversation,
    activeConversationId,
    ensureActiveConversationId,
    conversations,
    selectConversation,
    updateConversationMessages,
    clearActiveConversation,
    selectedChapter,
    setSelectedChapter,
    availableChapters,
    markChapterStudied,
    topK,
    contextWindow,
    setLastRagExecution,
    studyProgress,
    saveAnswer,
    setQuizTopicSeed,
    theme,
    toggleTheme,
  } = useApp();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null); // { file, previewUrl, name, size }
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSelectPDF = (file) => {
    if (file) {
      if (setPendingUploadFile) setPendingUploadFile(file);
      setUploadModalOpen(true);
    }
  };

  const handleSelectImage = (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAttachedImage({
      file,
      previewUrl,
      name: file.name,
      size: file.size,
    });
  };

  const handleCaptureCamera = (file, previewUrl) => {
    setAttachedImage({
      file,
      previewUrl,
      name: file.name || `camera_snap_${Date.now()}.jpg`,
      size: file.size,
    });
  };

  const handleRemoveAttachment = () => {
    if (attachedImage?.previewUrl) {
      URL.revokeObjectURL(attachedImage.previewUrl);
    }
    setAttachedImage(null);
  };

  const messages = activeConversation?.messages ?? [];
  const hasMessages = messages.length > 0;
  const geminiConfigured = status ? Boolean(status.gemini_configured) : true;
  const backendOffline = !status || status.status !== 'online';

  const dailyTip = DAILY_TIP;

  const recentNonEmpty = conversations
    .filter(c => c.messages.length > 0 && c.id !== activeConversationId)
    .slice(0, 4);

  const selectedChapterObj = availableChapters.find(c => c.chapter_number === selectedChapter);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  const sendQuery = async (rawText, { isRegenerate = false, customTargetId = null } = {}) => {
    const q = (rawText ?? input).trim();
    if ((!q && !attachedImage) || sending) return;

    // Use ensureActiveConversationId to GUARANTEE we have a valid conversation ID on the first turn
    const targetConvId = customTargetId || ensureActiveConversationId();
    if (!targetConvId) return;

    if (selectedChapter != null) {
      markChapterStudied(selectedChapter);
    }

    const currentAttachment = attachedImage;
    if (attachedImage) {
      setAttachedImage(null);
    }

    if (!isRegenerate) {
      setInput('');
      const userMsg = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: q || (currentAttachment ? 'Examine and explain this textbook figure.' : ''),
        image: currentAttachment?.previewUrl || null,
        imageName: currentAttachment?.name || null,
      };
      updateConversationMessages(targetConvId, prev => [...prev, userMsg]);
    }

    setSending(true);
    incrementQuestions();
    const t0 = Date.now();

    const scopedQuery = selectedChapter != null && selectedChapterObj
      ? `[Chapter ${selectedChapter}: ${selectedChapterObj.chapter_title}] ${q}`
      : q;

    try {
      let res;
      if (currentAttachment?.file) {
        const formData = new FormData();
        formData.append('file', currentAttachment.file);
        formData.append('query', scopedQuery || 'Please analyze this textbook figure, diagram, or problem and explain it in detail.');
        if (selectedChapter != null) {
          formData.append('chapter_filter', selectedChapter);
        }
        formData.append('top_k', topK);
        formData.append('context_window', contextWindow);
        res = await api.chatImage(formData);
      } else {
        res = await api.chat({
          query: scopedQuery,
          top_k: topK,
          context_window: contextWindow,
        });
      }
      const elapsed = (Date.now() - t0) / 1000;

      const retrievedChunks = res.retrieval?.top_results ?? [];
      const contextUsed = res.context_passed_to_llm ?? res.retrieval?.expanded_context ?? '';
      const llm = res.llm ?? {};

      setLastRagExecution({
        query: q || 'Textbook Image Analysis',
        scopedQuery,
        retrieval: res.retrieval,
        context_passed_to_llm: contextUsed,
        llm,
        timestamp: new Date().toISOString(),
      });

      const ragData = {
        chunks: retrievedChunks,
        context: contextUsed,
        full_prompt: llm.prompt ?? '',
        model: llm.model ?? '',
      };

      if (llm.success === false) {
        const errCode = llm.error_code || '';
        const friendlyErr =
          errCode === 'not_configured'
            ? 'AI service configuration is incomplete. Please contact the administrator.'
            : 'The AI service is temporarily unavailable. Please try again.';

        const errMsg = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          error: friendlyErr,
          rag: ragData,
        };
        updateConversationMessages(targetConvId, prev => [...prev, errMsg]);
        addLog(`Tutor: "${(q || 'Image').slice(0, 40)}..."`, 'error', llm.error || friendlyErr, elapsed.toFixed(2));
      } else {
        const aiMsg = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: llm.answer ?? '',
          elapsed,
          rag: ragData,
        };
        updateConversationMessages(targetConvId, prev => [...prev, aiMsg]);
        addLog(
          `Tutor: "${(q || 'Image').slice(0, 40)}..."`,
          'success',
          `${retrievedChunks.length} chunks · ${elapsed.toFixed(1)}s`,
          elapsed.toFixed(2)
        );
      }
    } catch (e) {
      const isNetworkErr =
        e instanceof TypeError ||
        e.message?.toLowerCase().includes('failed to fetch') ||
        e.message?.toLowerCase().includes('network');

      updateConversationMessages(targetConvId, prev => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          error: isNetworkErr
            ? 'Unable to connect to the Science AI Tutor server.'
            : 'The AI service is temporarily unavailable. Please try again.',
        },
      ]);
      addLog(`Tutor: "${(q || 'Image').slice(0, 40)}..."`, 'error', e.message);
    } finally {
      setSending(false);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  };

  const handleRegenerate = () => {
    if (sending || messages.length === 0) return;
    const targetConvId = ensureActiveConversationId();
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualUserIdx = messages.length - 1 - lastUserIdx;
    const lastUserPrompt = messages[actualUserIdx].content;

    updateConversationMessages(targetConvId, prev => prev.slice(0, actualUserIdx + 1));
    sendQuery(lastUserPrompt, { isRegenerate: true, customTargetId: targetConvId });
  };

  const handleSaveEdit = (editedMsgIndex, newText) => {
    if (sending) return;
    const targetConvId = ensureActiveConversationId();
    // Invalidate/truncate everything after the edited message, and replace the user message with newText
    const updatedUserMsg = {
      ...messages[editedMsgIndex],
      content: newText,
      editedAt: new Date().toISOString(),
    };
    // Slice up to edited message, replacing it
    const truncated = [...messages.slice(0, editedMsgIndex), updatedUserMsg];
    updateConversationMessages(targetConvId, truncated);
    // Submit the new query to generate fresh AI response
    sendQuery(newText, { isRegenerate: true, customTargetId: targetConvId });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const handleGenerateQuizFromMessage = (topicText) => {
    setQuizTopicSeed(topicText);
    setCurrentPage('quiz');
  };

  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compact Top Header */}
      <header className="h-14 px-4 sm:px-6 border-b border-cream-400 dark:border-[#3B473E] bg-cream-100/90 dark:bg-[#202823]/90 backdrop-blur-sm flex items-center justify-between gap-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-forest dark:text-[#F1F3EE] hover:bg-cream-300 dark:hover:bg-[#303B33]"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-forest dark:text-[#F1F3EE] truncate font-heading">
              Science <span className="font-serif italic text-sage-dark dark:text-[#9BB99A] font-semibold">AI</span> Tutor
            </h1>
            <p className="text-[11px] text-warm-grey dark:text-[#8E9B90] hidden sm:block truncate">
              Your personal <span className="font-serif italic">Class 10</span> learning companion.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-cream-400 dark:border-[#3B473E] bg-cream-200 dark:bg-[#2A352F] text-forest dark:text-[#F1F3EE] hover:bg-cream-300 dark:hover:bg-[#344037] transition-colors"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-forest" />}
          </button>

          <select
            value={selectedChapter ?? ''}
            onChange={e => setSelectedChapter(e.target.value ? Number(e.target.value) : null)}
            className="bg-cream-200 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-lg px-2.5 py-1.5 text-xs text-forest dark:text-[#F1F3EE] focus:outline-none focus:ring-1 focus:ring-sage max-w-[165px] sm:max-w-[220px]"
            title="Filter by chapter"
          >
            <option value="">All Chapters (Complete Book)</option>
            {availableChapters.map(ch => (
              <option key={ch.chapter_number} value={ch.chapter_number}>
                Ch.{ch.chapter_number}: {ch.chapter_title}
              </option>
            ))}
          </select>

          {hasMessages && (
            <button
              onClick={() => setConfirmClear(true)}
              className="btn-secondary !py-1.5 !px-2.5 text-xs flex items-center gap-1"
              title="Clear conversation"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </header>

      {/* Clear chat confirmation modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-forest dark:text-[#F1F3EE] font-heading">Clear this conversation?</h3>
              <button onClick={() => setConfirmClear(false)} className="text-warm-grey dark:text-[#8E9B90] hover:text-forest dark:hover:text-[#F1F3EE]">
                <X size={15} />
              </button>
            </div>
            <p className="text-xs text-warm-grey dark:text-[#8E9B90] leading-relaxed">
              This will remove all messages in the current chat. Saved answers in Study Progress will not be affected.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmClear(false)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() => { clearActiveConversation(); setConfirmClear(false); }}
                className="btn-primary text-xs !bg-red-700 hover:!bg-red-800 text-white"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backend / Configuration Notices */}
      {backendOffline && (
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 px-4 sm:px-6 py-2 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 flex-shrink-0">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>Unable to connect to the Science AI Tutor server.</span>
        </div>
      )}

      {!backendOffline && !geminiConfigured && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 sm:px-6 py-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 flex-shrink-0">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>AI service configuration is incomplete. Please contact the administrator.</span>
        </div>
      )}

      {/* Main Content Area */}
      {!hasMessages ? (
        /* Centered Welcome Screen */
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center scrollbar-thin">
          <div className="w-full max-w-2xl my-auto space-y-6">
            {/* Hero Logo + Welcome */}
            <div className="text-center space-y-3 pt-2">
              <div className="flex justify-center">
                <ScienceLogo size="lg" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <span className="font-script text-[18px] sm:text-[20px] font-bold text-forest dark:text-[#9BB99A] tracking-wide inline-block">
                    welcome to
                  </span>
                </div>
                <h2 className="text-3xl sm:text-[40px] font-extrabold text-forest dark:text-[#F1F3EE] tracking-tight font-heading leading-tight">
                  Science <span className="font-serif font-bold italic text-sage-dark dark:text-[#9BB99A]">AI</span> Tutor
                </h2>
                <div className="flex justify-center">
                  <span className="w-12 h-1 bg-sage dark:bg-[#9BB99A] rounded-full" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-warm-grey dark:text-[#8E9B90] uppercase tracking-widest font-heading">
                  NCERT Class 10 <span className="font-serif font-bold italic capitalize text-forest dark:text-[#F1F3EE] tracking-normal">Learning Companion</span>
                </p>
              </div>
              <div className="bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl p-5 text-sm sm:text-[15px] text-forest/90 dark:text-[#F1F3EE]/90 leading-relaxed shadow-card max-w-xl mx-auto space-y-2 text-left">
                <div className="flex items-baseline gap-2">
                  <span className="font-script text-[22px] sm:text-[24px] text-forest dark:text-[#9BB99A] font-bold">Hello student,</span>
                  <span className="font-serif italic font-bold text-forest dark:text-[#F1F3EE] text-base sm:text-[17px]">ready to learn?</span>
                </div>
                <p className="text-forest/85 dark:text-[#E2E8E0] leading-relaxed">
                  Ask me anything from your Class 10 textbook. I explain difficult physics laws, chemistry reactions, and biology concepts using <span className="font-serif italic font-bold text-forest dark:text-[#F1F3EE]">intuitive analogies</span> and <span className="font-serif italic font-bold text-forest dark:text-[#F1F3EE]">verified textbook passages</span>.
                </p>
              </div>
            </div>

            {/* Daily Learning Tip */}
            <div className="flex items-start gap-2.5 bg-cream-300/60 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-xl px-4 py-2.5 text-xs text-forest dark:text-[#F1F3EE]">
              <Lightbulb size={15} className="text-sage-dark dark:text-[#9BB99A] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{dailyTip}</p>
            </div>

            {/* Centered Large Chat Input */}
            <div className="bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl p-3 shadow-card focus-within:ring-2 focus-within:ring-sage/40 focus-within:border-sage transition-all">
              {/* Attachment Preview Tray */}
              {attachedImage && (
                <div className="flex items-center gap-2.5 p-2 mb-2 rounded-xl bg-cream-200/90 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] w-fit max-w-full">
                  <div className="relative group">
                    <img
                      src={attachedImage.previewUrl}
                      alt="Attachment preview"
                      className="w-14 h-14 object-cover rounded-lg border border-cream-400 dark:border-[#3B473E]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-forest dark:bg-[#344037] text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-xs"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-forest dark:text-[#F1F3EE] truncate max-w-[180px] sm:max-w-[240px]">
                      {attachedImage.name}
                    </p>
                    <p className="text-[10px] text-warm-grey dark:text-[#8E9B90]">
                      {(attachedImage.size / 1024).toFixed(0)} KB · Ready to analyze
                    </p>
                  </div>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                placeholder={
                  attachedImage
                    ? 'Ask a question about this image, or click Send to analyze...'
                    : selectedChapterObj
                      ? `Ask a question from Chapter ${selectedChapterObj.chapter_number}: ${selectedChapterObj.chapter_title}...`
                      : 'Ask any Class 10 Science question...'
                }
                rows={2}
                className="w-full bg-transparent text-sm text-forest dark:text-[#F1F3EE] placeholder:text-warm-beige dark:placeholder:text-[#6C7B70] resize-none focus:outline-none px-1.5 py-1 leading-relaxed"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1 border-t border-cream-300 dark:border-[#3B473E]">
                <div className="flex items-center gap-2">
                  <AttachmentMenu
                    onSelectPDF={handleSelectPDF}
                    onSelectImage={handleSelectImage}
                    onOpenTakeCamera={() => setCameraModalOpen(true)}
                    disabled={sending}
                  />

                  {selectedChapter != null && (
                    <span className="badge badge-sage text-[11px] font-bold">
                      Ch.{selectedChapter}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => sendQuery()}
                  disabled={sending || (!input.trim() && !attachedImage)}
                  className="btn-primary !py-1.5 !px-4 flex items-center gap-1.5 text-xs font-bold"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>{sending ? 'Analyzing...' : 'Send'}</span>
                </button>
              </div>
            </div>

            {/* Quick Access Learning Modes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setCurrentPage('quiz')}
                className="card card-hover p-4 text-left space-y-1.5 transition-all group"
              >
                <HelpCircle size={18} className="text-sage-dark dark:text-[#9BB99A] group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-forest dark:text-[#F1F3EE] font-heading">Quiz Mode</p>
                <p className="text-xs text-warm-grey dark:text-[#8E9B90] leading-snug">Test yourself with MCQs</p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('flashcards')}
                className="card card-hover p-4 text-left space-y-1.5 transition-all group"
              >
                <Layers size={18} className="text-sage-dark dark:text-[#9BB99A] group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-forest dark:text-[#F1F3EE] font-heading">Flashcards</p>
                <p className="text-xs text-warm-grey dark:text-[#8E9B90] leading-snug">Quick Q&A revision</p>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('notes')}
                className="card card-hover p-4 text-left space-y-1.5 transition-all group"
              >
                <FileText size={18} className="text-sage-dark dark:text-[#9BB99A] group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-forest dark:text-[#F1F3EE] font-heading">Chapter Summaries</p>
                <p className="text-xs text-warm-grey dark:text-[#8E9B90] leading-snug">Laws, formulas & notes</p>
              </button>

              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="card card-hover p-4 text-left space-y-1.5 transition-all group"
              >
                <Upload size={18} className="text-sage-dark dark:text-[#9BB99A] group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-forest dark:text-[#F1F3EE] font-heading">Upload Textbook</p>
                <p className="text-xs text-warm-grey dark:text-[#8E9B90] leading-snug">Add chapter PDFs</p>
              </button>
            </div>

            {/* Suggested Questions */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-warm-grey dark:text-[#8E9B90] text-center tracking-wider uppercase font-heading">
                Try asking one of these questions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuery(q)}
                    disabled={sending}
                    className="text-left p-3.5 rounded-xl bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300/80 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-[13px] font-semibold text-forest dark:text-[#F1F3EE] leading-snug transition-all hover:shadow-card hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Conversations */}
            {recentNonEmpty.length > 0 && (
              <div className="space-y-2 pb-2">
                <p className="text-xs font-bold text-warm-grey dark:text-[#8E9B90] text-center tracking-wider uppercase font-heading">
                  Recent conversations
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {recentNonEmpty.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-100 dark:bg-[#252F29] hover:bg-cream-300 dark:hover:bg-[#303B33] border border-cream-400 dark:border-[#3B473E] text-xs text-forest dark:text-[#F1F3EE] transition-colors"
                    >
                      <MessageSquare size={12} className="text-sage-dark dark:text-[#9BB99A]" />
                      <span className="max-w-[180px] truncate">{conv.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Active Conversational Thread */
        <>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 scrollbar-thin">
            {messages.map((msg, idx) => {
              const prevUserMsg = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user');
              const isSaved = studyProgress.savedAnswers.some(a => a.id === msg.id);
              return (
                <ChatMessage
                  key={msg.id || idx}
                  msg={msg}
                  msgIndex={idx}
                  userQuestion={prevUserMsg?.content}
                  isLastAssistant={msg.id === lastAssistantId}
                  sending={sending}
                  isSaved={isSaved}
                  onLearningAction={prompt => sendQuery(prompt)}
                  onGenerateQuiz={handleGenerateQuizFromMessage}
                  onSaveAnswer={() =>
                    saveAnswer({
                      id: msg.id,
                      question: prevUserMsg?.content || 'Science Topic',
                      answer: msg.content,
                      chapter: selectedChapter,
                      sources: msg.rag?.chunks?.map(c => ({
                        chapter: c.chapter,
                        chapter_title: c.chapter_title,
                        page: c.page,
                        chunk_id: c.chunk_id,
                      })) || [],
                    })
                  }
                  onRegenerate={handleRegenerate}
                  onSaveEdit={handleSaveEdit}
                />
              );
            })}
            {sending && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Bottom Sticky Input Bar */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-cream-400 dark:border-[#3B473E] bg-cream-100/90 dark:bg-[#202823]/90 backdrop-blur-sm flex-shrink-0">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Attachment Preview Tray */}
              {attachedImage && (
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] w-fit shadow-xs">
                  <div className="relative group">
                    <img
                      src={attachedImage.previewUrl}
                      alt="Attachment preview"
                      className="w-12 h-12 object-cover rounded-lg border border-cream-400 dark:border-[#3B473E]"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-forest dark:bg-[#344037] text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-xs"
                      title="Remove image"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-forest dark:text-[#F1F3EE] truncate max-w-[160px] sm:max-w-[220px]">
                      {attachedImage.name}
                    </p>
                    <p className="text-[10px] text-warm-grey dark:text-[#8E9B90]">
                      {(attachedImage.size / 1024).toFixed(0)} KB · Attached
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2 bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl p-2 shadow-card focus-within:ring-2 focus-within:ring-sage/40 focus-within:border-sage transition-all">
                <div className="pb-0.5">
                  <AttachmentMenu
                    onSelectPDF={handleSelectPDF}
                    onSelectImage={handleSelectImage}
                    onOpenTakeCamera={() => setCameraModalOpen(true)}
                    disabled={sending}
                  />
                </div>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  placeholder={
                    attachedImage
                      ? 'Ask a question about this image, or send to analyze...'
                      : 'Ask a follow-up question...'
                  }
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-forest dark:text-[#F1F3EE] placeholder:text-warm-beige dark:placeholder:text-[#6C7B70] resize-none focus:outline-none py-1.5 px-1 max-h-32 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => sendQuery()}
                  disabled={sending || (!input.trim() && !attachedImage)}
                  className="btn-primary !p-2 rounded-xl flex-shrink-0"
                  title="Send message"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-warm-grey dark:text-[#8E9B90] text-center">
                Press Enter to send · Shift+Enter for new line · Grounded in Class 10 NCERT Science
              </p>
            </div>
          </div>
        </>
      )}

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCaptureCamera}
      />
    </div>
  );
}
