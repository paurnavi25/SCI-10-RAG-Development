import { useState, useEffect } from 'react';
import {
  Cpu, Database, Search, Server, Sparkles, RefreshCw,
  CheckCircle2, AlertCircle, XCircle, Sun, Moon
} from 'lucide-react';
import { useApp } from '../context/AppContext';

function StatusBadge({ ok, warn, label }) {
  const cls = ok ? 'badge-green' : warn ? 'badge-amber' : 'badge-red';
  return (
    <span className={`badge ${cls} text-[11px]`}>
      {ok ? <CheckCircle2 size={11} /> : warn ? <AlertCircle size={11} /> : <XCircle size={11} />}
      {label}
    </span>
  );
}

export default function Settings() {
  const { status, refreshStatus, topK, contextWindow, theme, setTheme } = useApp();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    refreshStatus(true);
  }, [refreshStatus]);

  const handleCheckHealth = async () => {
    setChecking(true);
    await refreshStatus(true);
    setChecking(false);
  };

  const online = status?.status === 'online';
  const geminiConfigured = Boolean(status?.gemini_configured);
  const geminiConnected = status?.gemini_connectivity === 'Connected';
  const vectorReady = status?.vector_db_status === 'Ready';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-forest dark:text-[#F1F3EE] font-heading">
            System & RAG Configuration
          </h2>
          <p className="text-xs text-warm-grey dark:text-[#8E9B90] mt-0.5">
            Read-only system diagnostics managed by the Science AI Tutor backend.
          </p>
        </div>
        <button
          onClick={handleCheckHealth}
          disabled={checking}
          className="btn-secondary text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Verifying...' : 'Verify Health'}
        </button>
      </div>

      {/* Theme Selector Card */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-forest dark:text-[#F1F3EE] flex items-center gap-2 font-heading">
          {theme === 'dark' ? <Moon size={16} className="text-amber-400" /> : <Sun size={16} className="text-amber-600" />}
          Appearance & Theme
        </h3>
        <p className="text-xs text-warm-grey dark:text-[#8E9B90]">
          Choose the color theme for your learning environment. Your preference is saved automatically.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
              theme === 'light'
                ? 'border-sage ring-2 ring-sage/30 bg-cream-100 shadow-sm'
                : 'border-cream-400 dark:border-[#3B473E] bg-cream-200/50 dark:bg-[#1E2520] hover:bg-cream-200 dark:hover:bg-[#252F29]'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F5F0E6] border border-[#DED7C8] flex items-center justify-center flex-shrink-0 text-amber-600">
              <Sun size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-forest dark:text-[#F1F3EE]">Light Theme</span>
                {theme === 'light' && <CheckCircle2 size={13} className="text-sage" />}
              </div>
              <p className="text-[11px] text-warm-grey dark:text-[#8E9B90] mt-0.5 leading-snug">
                Warm cream background (#F5F0E6) with fine grid overlay & forest green accents.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
              theme === 'dark'
                ? 'border-sage ring-2 ring-sage/30 bg-[#252F29] shadow-sm'
                : 'border-cream-400 dark:border-[#3B473E] bg-cream-200/50 dark:bg-[#1E2520] hover:bg-cream-200 dark:hover:bg-[#252F29]'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#171C19] border border-[#3B473E] flex items-center justify-center flex-shrink-0 text-amber-400">
              <Moon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-forest dark:text-[#F1F3EE]">Dark Theme</span>
                {theme === 'dark' && <CheckCircle2 size={13} className="text-[#9BB99A]" />}
              </div>
              <p className="text-[11px] text-warm-grey dark:text-[#8E9B90] mt-0.5 leading-snug">
                Comfortable dark slate (#171C19) with soft sage accents (#9BB99A).
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Separated Backend Health Checks */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-forest dark:text-[#F1F3EE] flex items-center gap-2 font-heading">
            <Server size={16} className="text-sage-dark dark:text-[#9BB99A]" />
            Backend Health Status
          </h3>
          {status?.checked_at && (
            <span className="text-[11px] text-warm-grey dark:text-[#8E9B90]">
              Last check: {new Date(status.checked_at).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-cream-200/70 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] flex items-center justify-between gap-2">
            <span className="text-warm-grey dark:text-[#8E9B90]">Backend API</span>
            <StatusBadge ok={online} label={online ? 'Online' : 'Offline'} />
          </div>

          <div className="p-3 rounded-xl bg-cream-200/70 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] flex items-center justify-between gap-2">
            <span className="text-warm-grey dark:text-[#8E9B90]">Gemini Config</span>
            <StatusBadge
              ok={online && geminiConfigured}
              warn={online && !geminiConfigured}
              label={!online ? 'Unknown' : geminiConfigured ? 'Configured' : 'Incomplete'}
            />
          </div>

          <div className="p-3 rounded-xl bg-cream-200/70 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] flex items-center justify-between gap-2">
            <span className="text-warm-grey dark:text-[#8E9B90]">Gemini Connectivity</span>
            <StatusBadge
              ok={online && geminiConnected}
              warn={online && geminiConfigured && !geminiConnected}
              label={!online ? 'Offline' : status?.gemini_connectivity || 'Unknown'}
            />
          </div>

          <div className="p-3 rounded-xl bg-cream-200/70 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] flex items-center justify-between gap-2">
            <span className="text-warm-grey dark:text-[#8E9B90]">Embedding Model</span>
            <StatusBadge
              ok={online}
              label={online ? (status?.embedding_model_status || 'Ready') : 'Offline'}
            />
          </div>

          <div className="p-3 rounded-xl bg-cream-200/70 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] flex items-center justify-between gap-2">
            <span className="text-warm-grey dark:text-[#8E9B90]">Vector Database</span>
            <StatusBadge
              ok={online && vectorReady}
              warn={online && !vectorReady}
              label={!online ? 'Offline' : (status?.vector_db_status || 'Empty')}
            />
          </div>

          <div className="p-3 rounded-xl bg-cream-200/70 dark:bg-[#1E2520] border border-cream-400 dark:border-[#3B473E] flex items-center justify-between gap-2">
            <span className="text-warm-grey dark:text-[#8E9B90]">Stored Chunks</span>
            <span className="font-mono font-semibold text-forest dark:text-[#F1F3EE]">
              {online ? (status?.total_chunks?.toLocaleString() ?? 0) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LLM Configuration */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-forest dark:text-[#F1F3EE] flex items-center gap-2 font-heading">
            <Sparkles size={16} className="text-sage-dark dark:text-[#9BB99A]" />
            LLM Configuration
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Provider</span>
              <span className="font-medium text-forest dark:text-[#F1F3EE]">{status?.llm_provider || 'Google Gemini'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Active Model</span>
              <span className="font-mono text-forest dark:text-[#F1F3EE]">{status?.llm_model || '—'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-warm-grey dark:text-[#8E9B90]">Configuration Status</span>
              <span className="font-medium text-forest dark:text-[#F1F3EE]">
                {!online ? 'Server Offline' : geminiConfigured ? 'Configured via Backend' : 'Incomplete'}
              </span>
            </div>
          </div>
        </div>

        {/* Embedding Configuration */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-forest dark:text-[#F1F3EE] flex items-center gap-2 font-heading">
            <Cpu size={16} className="text-sage-dark dark:text-[#9BB99A]" />
            Embedding Configuration
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Model</span>
              <span className="font-mono text-forest dark:text-[#F1F3EE]">{status?.embedding_model || 'all-MiniLM-L6-v2'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Embedding Dimensions</span>
              <span className="font-mono text-forest dark:text-[#F1F3EE]">{status?.dimensions ?? 384}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-warm-grey dark:text-[#8E9B90]">Status</span>
              <span className="font-medium text-forest dark:text-[#F1F3EE]">
                {online ? (status?.embedding_model_status || 'Ready') : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Vector Database */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-forest dark:text-[#F1F3EE] flex items-center gap-2 font-heading">
            <Database size={16} className="text-sage-dark dark:text-[#9BB99A]" />
            Vector Database
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Database Type</span>
              <span className="font-medium text-forest dark:text-[#F1F3EE]">
                {status?.vector_db_type || 'In-Memory Cosine Similarity Index'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Collection / Index</span>
              <span className="font-medium text-forest dark:text-[#F1F3EE]">
                NCERT Class 10 Science ({status?.available_local_pdfs?.length ?? 0} PDFs)
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-warm-grey dark:text-[#8E9B90]">Total Stored Chunks</span>
              <span className="font-mono text-forest dark:text-[#F1F3EE]">
                {status?.total_chunks?.toLocaleString() ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Retrieval Configuration */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-forest dark:text-[#F1F3EE] flex items-center gap-2 font-heading">
            <Search size={16} className="text-sage-dark dark:text-[#9BB99A]" />
            Retrieval Configuration
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Current Top-K</span>
              <span className="font-mono text-forest dark:text-[#F1F3EE]">{topK ?? status?.default_top_k ?? 3} chunks</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-cream-300 dark:border-[#303B33]">
              <span className="text-warm-grey dark:text-[#8E9B90]">Context Window</span>
              <span className="font-mono text-forest dark:text-[#F1F3EE]">
                ±{contextWindow ?? status?.default_context_window ?? 2} adjacent chunks
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-warm-grey dark:text-[#8E9B90]">Similarity Search Method</span>
              <span className="font-medium text-forest dark:text-[#F1F3EE]">{status?.similarity_method || 'Cosine Similarity'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
