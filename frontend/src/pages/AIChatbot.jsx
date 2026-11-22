import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, ChevronDown, ChevronUp, Copy, Check, AlertTriangle, Loader2, BookOpen, Zap, ExternalLink } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

const SUGGESTED_IN_SYLLABUS = [
  'What is a chemical reaction? Give two examples.',
  'Why does the colour of copper sulphate solution change when iron is dipped in it?',
  'What is rancidity and how can we prevent it?',
  'Explain the process of respiration as a chemical reaction.',
  'What happens when dilute hydrochloric acid is added to iron filings?',
];

const SUGGESTED_BEYOND = [
  'How do vaccines work using the principle of immunity?',
  'What is the greenhouse effect and how does it relate to chemical reactions?',
  'Why do fireworks produce different colours?',
  'How does rusting of iron affect bridges and buildings?',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-sage/20 border border-sage/30 flex items-center justify-center flex-shrink-0">
        <BookOpen size={12} className="text-sage" />
      </div>
      <div className="card px-4 py-3 border-sage/30">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-sage rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-sage rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function RAGPanel({ ragData }) {
  const [open, setOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  if (!ragData) return null;

  return (
    <div className="mt-2 border border-cream-400 rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-cream-200 hover:bg-cream-300 transition-colors text-warm-grey"
      >
        <span className="flex items-center gap-1.5">
          <Zap size={11} className="text-sage" />
          RAG Execution Panel · {ragData.chunks?.length ?? 0} chunks retrieved
          {ragData.model && <span className="font-mono text-[10px] text-sage-dark">({ragData.model})</span>}
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="p-3 space-y-3 bg-cream-100">
          {/* Retrieved chunks */}
          <div>
            <p className="font-semibold text-forest mb-2 text-[11px] uppercase tracking-wide">Retrieved Chunks</p>
            <div className="space-y-2">
              {ragData.chunks?.map((c, i) => (
                <div key={i} className="border border-cream-400 rounded-lg p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="mono-value text-[10px]">{c.chunk_id}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-warm-grey text-[10px]">Ch.{c.chapter} · P.{c.page}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-cream-300 rounded-full h-1">
                          <div className="bg-sage h-1 rounded-full" style={{ width: `${Math.max(0, Math.min(100, (c.score ?? 0) * 100))}%` }} />
                        </div>
                        <span className="text-sage font-mono text-[10px]">{(c.score ?? 0).toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-forest leading-relaxed line-clamp-2 text-[11px]">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Context injected */}
          {ragData.context && (
            <div>
              <p className="font-semibold text-forest mb-1.5 text-[11px] uppercase tracking-wide">Context Injected into Prompt</p>
              <pre className="bg-cream-200 border border-cream-400 rounded p-2 text-[10px] text-forest whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto font-mono">
                {ragData.context}
              </pre>
            </div>
          )}

          {/* Full prompt toggle */}
          {ragData.full_prompt && (
            <div>
              <button
                onClick={() => setShowPrompt(p => !p)}
                className="text-sage hover:text-sage-dark text-[11px] flex items-center gap-1"
              >
                <ExternalLink size={10} />
                {showPrompt ? 'Hide' : 'Show'} Full Teacher Prompt
              </button>
              {showPrompt && (
                <pre className="mt-1.5 bg-cream-200 border border-cream-400 rounded p-2 text-[10px] text-forest whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono">
                  {ragData.full_prompt}
                </pre>
              )}
            </div>
          )}

          {/* Sources */}
          {ragData.chunks && ragData.chunks.length > 0 && (
            <div>
              <p className="font-semibold text-forest mb-1.5 text-[11px] uppercase tracking-wide">Sources</p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Map(ragData.chunks.map(c => [c.chunk_id, c])).values()].map((c, i) => (
                  <span key={i} className="badge badge-sage text-[10px]">
                    {c.chapter_title ?? `Ch.${c.chapter}`} · P.{c.page}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} className="text-warm-grey hover:text-forest transition-colors p-1 rounded" title="Copy response">
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </button>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm bg-forest text-cream-100 text-sm leading-relaxed shadow-sm">
          {msg.content}
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-sage/20 border border-sage/30 flex items-center justify-center flex-shrink-0">
        <BookOpen size={12} className="text-sage" />
      </div>
      <div className="max-w-[80%] space-y-1">
        <div className="card px-4 py-3 border-sage/30 text-sm leading-relaxed text-forest">
          {msg.error ? (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-medium text-amber-700">{msg.error}</p>
                {msg.content && <p className="text-warm-grey text-xs">{msg.content}</p>}
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
        {!msg.error && (
          <div className="flex items-center gap-1 px-1">
            <CopyBtn text={msg.content} />
            {msg.rag && (
              <span className="text-[10px] text-warm-grey">{msg.rag.chunks?.length ?? 0} chunks · </span>
            )}
            {msg.elapsed != null && (
              <span className="text-[10px] text-warm-grey">{msg.elapsed.toFixed(1)}s</span>
            )}
          </div>
        )}
        <RAGPanel ragData={msg.rag} />
      </div>
    </div>
  );
}

export default function AIChatbot() {
  const { addLog, status, incrementQuestions } = useApp();
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'assistant',
      content: "Hello! I'm your NCERT Class 10 Science teacher. I can help you understand topics from the textbook and related science concepts. What would you like to learn today?",
      rag: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [topK, setTopK] = useState(3);
  const [contextWindow, setContextWindow] = useState(2);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const geminiReady = Boolean(status?.gemini_configured);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;

    setInput('');
    const userMsg = { id: Date.now(), role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    incrementQuestions();
    const t0 = Date.now();

    try {
      const res = await api.chat({ query: q, top_k: topK, context_window: contextWindow });
      const elapsed = (Date.now() - t0) / 1000;

      // Backend returns { query, retrieval: { top_results, window_chunks, expanded_context }, context_passed_to_llm, llm: { success, error, answer, prompt, context_used, model } }
      const retrievedChunks = res.retrieval?.top_results ?? [];
      const contextUsed     = res.context_passed_to_llm ?? res.retrieval?.expanded_context ?? '';
      const llm             = res.llm ?? {};

      const ragData = {
        chunks: retrievedChunks,
        context: contextUsed,
        full_prompt: llm.prompt ?? '',
        model: llm.model ?? '',
      };

      if (llm.success === false) {
        const errCode   = llm.error_code || '';
        const errText   = llm.error || 'Failed to generate answer.';

        // Map backend error codes to student-friendly messages
        let userMessage;
        if (errCode === 'not_configured' || errCode === 'auth_failed') {
          userMessage = 'AI service configuration is incomplete. Please contact the administrator.';
        } else if (errCode === 'unavailable') {
          userMessage = 'The AI service is temporarily unavailable. Please try again.';
        } else {
          userMessage = 'The AI service is temporarily unavailable. Please try again.';
        }

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          error: userMessage,
          content: '',
          rag: ragData,
        }]);
        addLog(`Chat: "${q.slice(0, 40)}..."`, 'error', errText, elapsed.toFixed(2));
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: llm.answer ?? '',
          elapsed,
          rag: ragData,
        }]);
        addLog(`Chat: "${q.slice(0, 40)}..."`, 'success', `${retrievedChunks.length} chunks · ${elapsed.toFixed(1)}s`, elapsed.toFixed(2));
      }
    } catch (e) {
      const errMsg = e.message || 'Unknown error';
      const isOffline = errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('networkerror') || errMsg.toLowerCase().includes('network');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        error: isOffline
          ? 'Unable to connect to the Science AI Tutor server.'
          : 'The AI service is temporarily unavailable. Please try again.',
        content: '',
      }]);
      addLog(`Chat: "${q.slice(0, 40)}..."`, 'error', errMsg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 0, role: 'assistant',
      content: "Chat cleared. I'm ready for your science questions!",
      rag: null,
    }]);
  };

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-cream-400 bg-cream-100 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-forest">AI Science Tutor</h2>
          <p className="text-xs text-warm-grey">Powered by Gemini · RAG-augmented · NCERT Class 10 Science</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Config */}
          <div className="flex items-center gap-3 text-xs text-warm-grey">
            <label className="flex items-center gap-1.5">
              Top-K
              <select
                value={topK}
                onChange={e => setTopK(Number(e.target.value))}
                className="input-field py-1 px-2 w-16 text-xs"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              Window
              <select
                value={contextWindow}
                onChange={e => setContextWindow(Number(e.target.value))}
                className="input-field py-1 px-2 w-16 text-xs"
              >
                {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <button onClick={clearChat} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs">
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {!geminiReady && status && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-800 flex-shrink-0">
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span>AI service configuration is incomplete. Please contact the administrator.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
        {messages.map(msg => (
          <Message key={msg.id} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      <div className="px-6 py-3 border-t border-cream-400 flex-shrink-0 bg-cream-100/60">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] text-warm-grey flex-shrink-0 self-center uppercase tracking-wide">In-syllabus:</span>
          {SUGGESTED_IN_SYLLABUS.map((q, i) => (
            <button
              key={i}
              disabled={loading}
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-cream-400 bg-cream-200 hover:bg-cream-300 text-forest transition-colors disabled:opacity-40"
            >
              {q.length > 42 ? q.slice(0, 42) + '...' : q}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] text-warm-grey flex-shrink-0 self-center uppercase tracking-wide">Beyond:</span>
          {SUGGESTED_BEYOND.map((q, i) => (
            <button
              key={i}
              disabled={loading}
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-sage/40 bg-sage/10 hover:bg-sage/20 text-sage-dark transition-colors disabled:opacity-40"
            >
              {q.length > 42 ? q.slice(0, 42) + '...' : q}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="px-6 py-4 border-t border-cream-400 bg-cream-100 flex-shrink-0">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask a science question (in-syllabus or beyond)..."
            rows={1}
            className="input-field resize-none flex-1 max-h-32 leading-relaxed py-2.5"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn-primary flex items-center gap-2 py-2.5 px-4 flex-shrink-0"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        <p className="text-[10px] text-warm-grey mt-1.5">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
