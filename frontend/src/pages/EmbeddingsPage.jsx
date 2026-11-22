import { useState } from 'react';
import { Cpu, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

function Bar({ value, max = 1 }) {
  const pct = Math.abs(value / max) * 100;
  const pos = value >= 0;
  return (
    <div className="flex items-center gap-1.5 h-5">
      <div className="w-16 flex justify-end">
        {!pos && (
          <div className="h-2.5 rounded bg-red-300" style={{ width: `${pct / 2}%`, maxWidth: '32px' }} />
        )}
      </div>
      <div className="w-0.5 h-4 bg-cream-500 flex-shrink-0" />
      <div className="w-16">
        {pos && (
          <div className="h-2.5 rounded bg-sage" style={{ width: `${pct / 2}%`, maxWidth: '32px' }} />
        )}
      </div>
      <span className="font-mono text-[10px] text-warm-grey w-14">{value.toFixed(5)}</span>
    </div>
  );
}

export default function EmbeddingsPage() {
  const { addLog, refreshStatus, status } = useApp();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const buildIndex = async () => {
    setLoading(true);
    try {
      const res = await api.buildIndex();
      setData(res);
      addLog('Vector index built', 'success',
        `${res.total_chunks} chunks, ${res.dimensions}d, ${res.indexing_time_seconds}s`,
        res.indexing_time_seconds);
      await refreshStatus();
    } catch (e) {
      addLog('Vector index build', 'error', e.message);
      alert('Error: ' + e.message);
    } finally { setLoading(false); }
  };

  const preview = data?.sample_vector_preview || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Header action */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-forest text-sm">Embedding Index</p>
          <p className="text-xs text-warm-grey mt-0.5">
            Model: <span className="font-mono">{status?.embedding_model || 'all-MiniLM-L6-v2'}</span>
            &nbsp;· {status?.total_chunks?.toLocaleString() || 0} chunks in corpus
          </p>
        </div>
        <button onClick={buildIndex} disabled={loading} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Building…' : 'Build / Refresh Index'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Embedding Model',   data?.embedding_model || status?.embedding_model || '—'],
          ['Dimensions',        data?.dimensions || status?.dimensions || 384],
          ['Chunks Embedded',   data?.total_chunks?.toLocaleString() || '—'],
          ['Index Build Time',  data ? `${data.indexing_time_seconds}s` : '—'],
        ].map(([label, val]) => (
          <div key={label} className="stat-card">
            <Cpu size={14} className="text-sage" />
            <span className="stat-value text-lg">{val}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      {data && (
        <>
          {/* Sample chunk */}
          <div className="card p-5 space-y-3">
            <p className="section-title">Sample Chunk · <span className="font-mono text-sage-dark">{data.sample_chunk_id}</span></p>
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              {[
                ['Chapter', data.sample_chunk_chapter],
                ['Page',    data.sample_chunk_page],
                ['Chunk ID',data.sample_chunk_id],
              ].map(([k, v]) => (
                <div key={k} className="bg-cream-200 rounded p-2">
                  <p className="text-warm-grey">{k}</p>
                  <p className="font-semibold font-mono text-forest">{v}</p>
                </div>
              ))}
            </div>
            <pre className="text-xs text-forest bg-cream-200 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">
              {data.sample_chunk_text}
            </pre>
          </div>

          {/* Vector preview */}
          <div className="card p-5 space-y-4">
            <p className="section-title">Embedding Vector Preview</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                ['L2 Norm',  data.vector_norm],
                ['Min',      data.vector_min],
                ['Max',      data.vector_max],
                ['Mean',     data.vector_mean],
              ].map(([k, v]) => (
                <div key={k} className="bg-cream-200 rounded p-2">
                  <p className="text-warm-grey">{k}</p>
                  <p className="font-mono font-semibold text-forest">{v}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs text-warm-grey mb-2">First {preview.length} of {data.dimensions} dimensions</p>
              <div className="bg-cream-200 rounded-lg p-3 space-y-0.5">
                {preview.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-warm-grey w-6 text-right">{i}</span>
                    <Bar value={v} max={Math.max(...preview.map(Math.abs))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Raw array */}
            <div>
              <button onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 text-xs text-sage hover:text-sage-dark">
                {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAll ? 'Hide' : 'Show'} raw float array
              </button>
              {showAll && (
                <pre className="mt-2 text-[10px] font-mono bg-forest text-cream-100 p-3 rounded-lg overflow-x-auto">
                  {'[\n  ' + preview.join(',\n  ') + ',\n  … (' + data.dimensions + ' total)\n]'}
                </pre>
              )}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="card p-10 text-center">
          <Cpu size={36} className="text-warm-beige mx-auto mb-3" />
          <p className="text-sm text-warm-grey">Click "Build / Refresh Index" to generate and inspect embedding vectors.</p>
        </div>
      )}
    </div>
  );
}

