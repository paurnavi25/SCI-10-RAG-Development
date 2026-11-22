import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Copy, Layers, X } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

const CH_NAMES = {
  1:'Chemical Reactions & Equations', 2:'Acids, Bases and Salts',
  3:'Metals and Non-metals', 4:'Carbon and its Compounds',
  5:'Life Processes', 6:'Control and Coordination',
  7:'How do Organisms Reproduce?', 8:'Heredity',
  9:'Light – Reflection and Refraction',10:'The Human Eye and the Colourful World',
  11:'Electricity',12:'Magnetic Effects of Electric Current',13:'Our Environment',
};

const PAGE_SIZE = 20;

function ChunkDetail({ chunk, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!chunk) return null;
  const copy = () => { navigator.clipboard.writeText(chunk.text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="card p-5 space-y-3 sticky top-4">
      <div className="flex items-start justify-between">
        <span className="mono-value">{chunk.chunk_id}</span>
        <button onClick={onClose}><X size={14} className="text-warm-grey hover:text-forest" /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['Chapter', `${chunk.chapter} · ${chunk.chapter_title}`],
          ['Page',    chunk.page],
          ['Block ID',chunk.block_id],
          ['Chars',   chunk.text?.length],
        ].map(([k, v]) => (
          <div key={k} className="bg-cream-200 rounded p-2">
            <p className="text-warm-grey">{k}</p>
            <p className="font-medium text-forest truncate">{v}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-warm-grey">Chunk Text</p>
          <button onClick={copy} className="flex items-center gap-1 text-xs text-sage hover:text-sage-dark">
            <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="text-xs text-forest bg-cream-200 p-3 rounded-lg whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto scrollbar-thin">
          {chunk.text}
        </pre>
      </div>
    </div>
  );
}

export default function ChunkExplorer() {
  const { status } = useApp();
  const [chunks, setChunks]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [search, setSearch]     = useState('');
  const [chapter, setChapter]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);

  const chapters = status?.chapter_counts
    ? Object.keys(status.chapter_counts).map(Number).sort((a, b) => a - b)
    : [];

  const load = useCallback(async (off = 0, overrides = null) => {
    setLoading(true); setOffset(off);
    const ch = overrides ? overrides.chapter : chapter;
    const q  = overrides ? overrides.search  : search;
    try {
      const data = await api.chunks({
        chapter: ch || undefined,
        search:  q  || undefined,
        limit:   PAGE_SIZE,
        offset:  off,
      });
      setChunks(data.chunks);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [chapter, search]);

  useEffect(() => {
    let cancelled = false;
    api.chunks({
      chapter: chapter || undefined,
      search:  search  || undefined,
      limit:   PAGE_SIZE,
      offset:  0,
    }).then(data => {
      if (!cancelled) {
        setOffset(0);
        setChunks(data.chunks);
        setTotal(data.total);
      }
    }).catch(e => console.error(e));
    return () => { cancelled = true; };
  }, [chapter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setSearch('');
    setChapter('');
    load(0, { chapter: '', search: '' });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-warm-grey font-medium block mb-1">Filter by Chapter</label>
          <select value={chapter} onChange={e => setChapter(e.target.value)} className="input-field">
            <option value="">All Chapters</option>
            {chapters.map(ch => <option key={ch} value={ch}>Ch. {ch} · {CH_NAMES[ch]}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-56">
          <label className="text-xs text-warm-grey font-medium block mb-1">Search Chunks</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-beige" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(0)}
              placeholder="Search text or chunk ID…" className="input-field pl-8" />
          </div>
        </div>
        <button onClick={() => load(0)} className="btn-primary">Search</button>
        <button onClick={handleReset} className="btn-secondary">Reset</button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between text-xs text-warm-grey px-1">
        <span>{total.toLocaleString()} chunks matched</span>
        <div className="flex items-center gap-2">
          <button onClick={() => load(offset - PAGE_SIZE)} disabled={offset === 0 || loading}
            className="btn-secondary !py-1 !px-2"><ChevronLeft size={13} /></button>
          <span>Page {currentPage} / {totalPages}</span>
          <button onClick={() => load(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total || loading}
            className="btn-secondary !py-1 !px-2"><ChevronRight size={13} /></button>
        </div>
      </div>

      {/* Main grid */}
      <div className={`grid gap-4 ${selected ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Chunk list */}
        <div className={`space-y-2 ${selected ? 'lg:col-span-2' : ''}`}>
          {loading && (
            <div className="card p-10 text-center text-sm text-warm-grey">Loading chunks…</div>
          )}
          {!loading && chunks.length === 0 && (
            <div className="card p-10 text-center">
              <Layers size={32} className="text-warm-beige mx-auto mb-2" />
              <p className="text-sm text-warm-grey">No chunks found. Adjust your filters.</p>
            </div>
          )}
          {!loading && chunks.map(chunk => (
            <div key={chunk.chunk_id} onClick={() => setSelected(chunk)}
              className={`chunk-card card-hover ${selected?.chunk_id === chunk.chunk_id ? 'ring-2 ring-sage border-sage' : ''}`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="mono-value">{chunk.chunk_id}</span>
                <div className="flex items-center gap-2 text-xs text-warm-grey">
                  <span>Ch. {chunk.chapter}</span>
                  <span>·</span>
                  <span>P. {chunk.page}</span>
                  <span>·</span>
                  <span>{chunk.text?.length} chars</span>
                </div>
              </div>
              <p className="text-xs text-warm-grey font-medium mb-1 truncate">{chunk.chapter_title}</p>
              <p className="text-sm text-forest leading-relaxed line-clamp-3">{chunk.text}</p>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div>
            <ChunkDetail chunk={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

