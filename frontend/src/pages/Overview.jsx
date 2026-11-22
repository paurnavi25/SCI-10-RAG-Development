import { useApp } from '../context/AppContext';
import {
  FileText, Layers, Cpu, Database, MessageCircle,
  ArrowRight, CheckCircle2, Circle, AlertCircle
} from 'lucide-react';

const CHAPTER_NAMES = {
  1:'Chemical Reactions & Equations', 2:'Acids, Bases and Salts',
  3:'Metals and Non-metals', 4:'Carbon and its Compounds',
  5:'Life Processes', 6:'Control and Coordination',
  7:'How do Organisms Reproduce?', 8:'Heredity',
  9:'Light – Reflection and Refraction', 10:'The Human Eye and the Colourful World',
  11:'Electricity', 12:'Magnetic Effects of Electric Current', 13:'Our Environment',
};

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="stat-card card-hover">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${accent || 'bg-sage/20'}`}>
        <Icon size={16} className="text-sage-dark" />
      </div>
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="text-[11px] text-warm-beige mt-0.5">{sub}</span>}
    </div>
  );
}

function PipelineStep({ label, done, count, time }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center min-w-[80px]">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
        done ? 'bg-sage/20 border-sage text-sage-dark' : 'bg-cream-300 border-cream-400 text-warm-beige'
      }`}>
        {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </div>
      <span className="text-[11px] font-medium text-forest leading-tight">{label}</span>
      {count != null && <span className="text-[10px] text-warm-grey">{count}</span>}
      {time  != null && <span className="text-[10px] text-warm-beige">{time}s</span>}
    </div>
  );
}

export default function Overview() {
  const { status, logs, setCurrentPage, questionsAsked } = useApp();
  const s = status;

  const totalChapters = s ? Object.keys(s.chapter_counts || {}).length : 0;
  const totalChunks   = s?.total_chunks || 0;
  const totalPDFs     = s?.available_local_pdfs?.length || 0;

  // Derive pipeline stages
  const stages = [
    { label: 'PDF Upload',      done: totalPDFs > 0,     count: `${totalPDFs} files` },
    { label: 'Extraction',      done: totalChunks > 0,   count: `${totalChapters} ch.` },
    { label: 'Chunking',        done: totalChunks > 0,   count: `${totalChunks.toLocaleString()} chunks` },
    { label: 'Embedding',       done: s?.indexed,        count: s?.indexed ? `${s.dimensions}d` : 'pending' },
    { label: 'Vector Storage',  done: s?.indexed,        count: s?.indexed ? 'in-memory' : 'pending' },
    { label: 'Retrieval',       done: s?.indexed,        count: 'cosine sim.' },
    { label: 'LLM Response',    done: s?.has_gemini_key, count: s?.llm_model?.split('-').slice(-2).join('-') },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={FileText}      label="PDFs Available"   value={totalPDFs}    sub="in workspace" />
        <StatCard icon={FileText}      label="Chapters Indexed" value={totalChapters} sub="in vector store" />
        <StatCard icon={Layers}        label="Text Chunks"      value={totalChunks.toLocaleString()} sub="all chapters" />
        <StatCard icon={Cpu}           label="Embedding Dims"   value={s?.dimensions || 384} sub={s?.embedding_model} />
        <StatCard icon={Database}      label="Vectors Stored"   value={s?.indexed ? totalChunks.toLocaleString() : '0'} sub="in-memory" />
        <StatCard icon={MessageCircle} label="Questions Asked"  value={questionsAsked} sub={s?.llm_model?.split('-').slice(-2).join('-') || 'Gemini'} />
      </div>

      {/* Pipeline progress */}
      <div className="card p-5">
        <p className="section-title mb-4">Pipeline Stages</p>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {stages.map((st, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <PipelineStep {...st} />
              {i < stages.length - 1 && (
                <ArrowRight size={16} className="text-cream-500 mt-[-16px]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chapter breakdown */}
      {s?.chapter_counts && Object.keys(s.chapter_counts).length > 0 && (
        <div className="card p-5">
          <p className="section-title mb-3">Indexed Chapters</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(s.chapter_counts).map(([ch, count]) => (
              <div key={ch} className="bg-cream-200 border border-cream-400 rounded-lg p-3">
                <p className="text-xs font-semibold text-forest">Ch. {ch}</p>
                <p className="text-[11px] text-warm-grey leading-snug mt-0.5">{CHAPTER_NAMES[ch] || `Chapter ${ch}`}</p>
                <p className="text-sm font-semibold text-sage-dark mt-1">{count} chunks</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="card p-5">
        <p className="section-title mb-3">Recent Activity</p>
        {logs.length === 0 ? (
          <p className="text-sm text-warm-grey text-center py-6">No activity yet. Upload a PDF to begin.</p>
        ) : (
          <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-thin">
            {logs.slice(0, 15).map(l => (
              <div key={l.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-cream-300">
                {l.status === 'success' ? (
                  <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                ) : l.status === 'error' ? (
                  <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                ) : (
                  <Circle size={12} className="text-warm-beige flex-shrink-0" />
                )}
                <span className="text-warm-grey flex-shrink-0 font-mono">
                  {new Date(l.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-medium text-forest truncate">{l.operation}</span>
                {l.detail && <span className="text-warm-grey truncate">{l.detail}</span>}
                {l.duration && <span className="text-warm-beige ml-auto flex-shrink-0">{l.duration}s</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <p className="section-title mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '📥  Upload PDF',          page: 'upload'    },
            { label: '📄  View Extracted Text',  page: 'extraction'},
            { label: '🧩  Explore Chunks',       page: 'chunks'    },
            { label: '🔍  Test Retrieval',       page: 'retrieval' },
            { label: '💬  Open Chatbot',         page: 'chatbot'   },
          ].map(({ label, page }) => (
            <button key={page} onClick={() => setCurrentPage(page)} className="btn-secondary">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

