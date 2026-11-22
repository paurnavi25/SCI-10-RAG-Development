import { useState, useEffect, useCallback } from 'react';
import { Database, Search, Eye } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

export default function VectorStore() {
  const { status } = useApp();
  const [search, setSearch]     = useState('');
  const [chapter, setChapter]   = useState('');
  const [chunks, setChunks]     = useState([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [vecData, setVecData]   = useState(null);

  const PAGE = 15;

  const chapters = status?.chapter_counts
    ? Object.keys(status.chapter_counts).map(Number).sort((a, b) => a - b)
    : [];

  const loadChunks = useCallback(async (off = 0) => {
    setLoading(true); setOffset(off);
    try {
      const data = await api.chunks({
        chapter: chapter || undefined,
        search:  search || undefined,
        limit:   PAGE,
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
      limit:   PAGE,
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

  const inspect = async (chunk) => {
    setSelected(chunk);
    // Build index to get fresh vector info
    try {
      const d = await api.buildIndex();
      setVecData(d);
    } catch {}
  };

  const totalChunks = status?.total_chunks || 0;
  const isIndexed   = status?.indexed;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* Store overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Vector Store Type', 'In-memory (NumPy/PyTorch)'],
          ['Total Vectors',     totalChunks.toLocaleString()],
          ['Dimensions',        status?.dimensions || 384],
          ['Index Status',      isIndexed ? '✓ Indexed' : '○ Not built'],
        ].map(([k, v]) => (
          <div key={k} className="stat-card">
            <Database size={14} className="text-sage" />
            <span className="stat-value text-base font-semibold">{v}</span>
            <span className="stat-label">{k}</span>
          </div>
        ))}
      </div>

      {/* Architecture note */}
      <div className="card p-4 text-xs text-warm-grey leading-relaxed">
        <span className="font-semibold text-forest">Architecture note: </span>
        This project uses an <span className="font-mono">in-memory PyTorch tensor store</span> rather than a dedicated 
        vector database (e.g. Pinecone, Chroma, FAISS). Embeddings are computed with 
        <span className="font-mono"> SentenceTransformers (all-MiniLM-L6-v2, 384d)</span> and similarity is calculated 
        via <span className="font-mono">cosine similarity</span> at query time. Chunk metadata is persisted in 
        <span className="font-mono"> structured_textbook_master.json</span>.
      </div>

      {/* Search & filter */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={chapter} onChange={e => setChapter(e.target.value)} className="input-field w-auto min-w-48">
          <option value="">All Chapters</option>
          {chapters.map(ch => <option key={ch} value={ch}>Ch. {ch}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-beige" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadChunks(0)}
            placeholder="Search stored records…" className="input-field pl-8" />
        </div>
        <button onClick={() => loadChunks(0)} className="btn-primary">Browse Records</button>
      </div>

      {/* Records table */}
      {chunks.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-cream-400 p-3 flex items-center justify-between text-xs text-warm-grey">
            <span>{total.toLocaleString()} records</span>
            <div className="flex gap-1">
              <button onClick={() => loadChunks(offset - PAGE)} disabled={offset === 0}
                className="btn-secondary !py-1 !px-2 text-xs">◀</button>
              <span className="px-2 py-1">{Math.floor(offset / PAGE) + 1}/{Math.ceil(total / PAGE) || 1}</span>
              <button onClick={() => loadChunks(offset + PAGE)} disabled={offset + PAGE >= total}
                className="btn-secondary !py-1 !px-2 text-xs">▶</button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-cream-300 border-b border-cream-400">
              <tr>
                {['Chunk ID','Chapter','Page','Chars','Text Preview',''].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-warm-grey font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {chunks.map(c => (
                <tr key={c.chunk_id} className="hover:bg-cream-200 transition-colors">
                  <td className="py-2 px-3 font-mono text-sage-dark">{c.chunk_id}</td>
                  <td className="py-2 px-3 text-warm-grey">{c.chapter}</td>
                  <td className="py-2 px-3">{c.page}</td>
                  <td className="py-2 px-3 text-warm-grey">{c.text?.length}</td>
                  <td className="py-2 px-3 max-w-xs truncate text-forest">{c.text}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => inspect(c)} className="text-sage hover:text-sage-dark">
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="card p-5 space-y-4">
          <p className="section-title">Record Detail · <span className="font-mono text-sage-dark">{selected.chunk_id}</span></p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {[
              ['Chunk ID',   selected.chunk_id],
              ['Chapter',    `${selected.chapter} · ${selected.chapter_title}`],
              ['Page',       selected.page],
              ['Block ID',   selected.block_id],
            ].map(([k, v]) => (
              <div key={k} className="bg-cream-200 rounded p-2">
                <p className="text-warm-grey">{k}</p>
                <p className="font-medium font-mono text-forest">{v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs text-warm-grey mb-1">Stored Text</p>
            <pre className="text-xs text-forest bg-cream-200 p-3 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">
              {selected.text}
            </pre>
          </div>
          {vecData && (
            <div>
              <p className="text-xs text-warm-grey mb-1">Vector Preview (Corpus Sample · {vecData.dimensions}d)</p>
              <pre className="text-[10px] font-mono bg-forest text-cream-100 p-3 rounded-lg overflow-x-auto">
                [{vecData.sample_vector_preview.slice(0, 8).map(v => v.toFixed(5)).join(', ')}, … ({vecData.dimensions} dims)]
              </pre>
            </div>
          )}
        </div>
      )}

      {chunks.length === 0 && !loading && (
        <div className="card p-10 text-center">
          <Database size={36} className="text-warm-beige mx-auto mb-3" />
          <p className="text-sm text-warm-grey">Click "Browse Records" to explore the vector store contents.</p>
        </div>
      )}
    </div>
  );
}

