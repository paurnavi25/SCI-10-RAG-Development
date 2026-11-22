import { useState } from 'react';
import { Search, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

const SAMPLE_QUERIES = [
  'Why do we need to rub the magnesium ribbon with sandpaper before burning it?',
  'What is rancidity and how can we prevent it?',
  'Why do we apply paint on iron articles?',
  'Why does distilled water not conduct electricity, but rain water does?',
  'What is the difference between exothermic and endothermic reactions?',
  'What happens when zinc granules are added to dilute sulphuric acid?',
];

function ScoreBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-cream-300 rounded-full h-1.5">
        <div className="bg-sage h-1.5 rounded-full" style={{ width: `${score * 100}%` }} />
      </div>
      <span className="font-mono text-xs text-sage-dark w-12 text-right">{score.toFixed(4)}</span>
    </div>
  );
}

function ChunkResult({ chunk, rank, expanded, onToggle }) {
  return (
    <div className={`card p-4 space-y-2 ${rank === 1 ? 'ring-1 ring-sage border-sage/60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
            rank === 1 ? 'bg-sage text-white' : 'bg-cream-300 text-warm-grey'
          }`}>{rank}</span>
          <span className="mono-value">{chunk.chunk_id}</span>
          {rank === 1 && <span className="badge badge-sage text-[10px]">Best Match</span>}
        </div>
        <button onClick={onToggle} className="text-warm-grey hover:text-forest">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-warm-grey">
        <span>Ch. {chunk.chapter} · {chunk.chapter_title}</span>
        <span>Page {chunk.page}</span>
      </div>

      <ScoreBar score={chunk.score} />

      <p className={`text-sm text-forest leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
        {chunk.text}
      </p>
    </div>
  );
}

export default function RetrievalInspector() {
  const { addLog } = useApp();
  const [query, setQuery]       = useState('');
  const [topK, setTopK]         = useState(3);
  const [window, setWindow]     = useState(2);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState({});
  const [showCtx, setShowCtx]   = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true); setResult(null);
    const t0 = Date.now();
    try {
      const res = await api.retrieve({ query: query.trim(), top_k: topK, context_window: window });
      setResult(res.data);
      addLog('Retrieval query', 'success', `"${query.trim().slice(0, 40)}…"`,
        ((Date.now() - t0) / 1000).toFixed(2));
    } catch (e) {
      addLog('Retrieval query', 'error', e.message);
      alert('Error: ' + e.message);
    } finally { setLoading(false); }
  };

  const toggleExpand = idx => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Query panel */}
      <div className="card p-5 space-y-4">
        <p className="section-title">Query the RAG Vector Store</p>

        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="Type a science question…"
            className="input-field flex-1" />
          <button onClick={run} disabled={!query.trim() || loading}
            className="btn-primary flex items-center gap-2 flex-shrink-0">
            <Search size={14} />
            {loading ? 'Searching…' : 'Retrieve'}
          </button>
        </div>

        {/* Config */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-warm-grey">Top-K:</label>
            <input type="number" min={1} max={10} value={topK} onChange={e => setTopK(+e.target.value)}
              className="input-field !w-16 text-center" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-warm-grey">Context window (±):</label>
            <input type="number" min={0} max={5} value={window} onChange={e => setWindow(+e.target.value)}
              className="input-field !w-16 text-center" />
          </div>
        </div>

        {/* Sample queries */}
        <div>
          <p className="text-xs text-warm-grey mb-2">Sample queries from the notebook:</p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_QUERIES.map(q => (
              <button key={q} onClick={() => setQuery(q)}
                className="text-[11px] bg-cream-300 hover:bg-cream-400 text-forest px-2.5 py-1 rounded-full border border-cream-400 transition-colors">
                {q.length > 55 ? q.slice(0, 55) + '…' : q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Top results */}
          <div className="space-y-3">
            <p className="section-title">Retrieved Chunks · Ranked by Cosine Similarity</p>
            {result.top_results.map((chunk, i) => (
              <ChunkResult key={chunk.chunk_id} chunk={chunk} rank={i + 1}
                expanded={!!expanded[i]} onToggle={() => toggleExpand(i)} />
            ))}
          </div>

          {/* Sliding window */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-title">Sliding Window Context (±{result.context_window_size} chunks)</p>
                <p className="text-xs text-warm-grey mt-0.5">
                  Best match index: {result.best_match_index} · ⭐ = primary semantic match
                </p>
              </div>
              <button onClick={() => setShowCtx(!showCtx)} className="btn-secondary !py-1 text-xs flex items-center gap-1">
                {showCtx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showCtx ? 'Hide' : 'Show'} Context
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {result.window_chunks.map(wc => (
                <span key={wc.chunk_id}
                  className={`text-xs px-2.5 py-1 rounded-full border font-mono ${
                    wc.is_target
                      ? 'bg-sage/20 border-sage text-sage-dark ring-1 ring-sage'
                      : 'bg-cream-300 border-cream-400 text-warm-grey'
                  }`}>
                  {wc.is_target ? '⭐ ' : ''}{wc.chunk_id}
                </span>
              ))}
            </div>

            {showCtx && (
              <pre className="text-xs text-forest bg-cream-200 p-4 rounded-lg whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto scrollbar-thin font-mono">
                {result.expanded_context}
              </pre>
            )}
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="card p-10 text-center">
          <Zap size={36} className="text-warm-beige mx-auto mb-3" />
          <p className="text-sm text-warm-grey">Enter a question above to run a live retrieval and inspect similarity scores.</p>
        </div>
      )}
    </div>
  );
}

