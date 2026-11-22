import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

export default function TextExtraction() {
  const { status } = useApp();
  const [selectedChapter, setSelectedChapter] = useState('');
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [quality, setQuality] = useState({});
  const [pageIdx, setPageIdx] = useState(0);
  const [info, setInfo] = useState(null);

  const chapters = status?.chapter_counts
    ? Object.keys(status.chapter_counts).map(Number).sort((a, b) => a - b)
    : [];

  const chapterNames = {
    1:'Chemical Reactions & Equations', 2:'Acids, Bases and Salts',
    3:'Metals and Non-metals', 4:'Carbon and its Compounds',
    5:'Life Processes', 6:'Control and Coordination',
    7:'How do Organisms Reproduce?', 8:'Heredity',
    9:'Light – Reflection and Refraction',10:'The Human Eye and the Colourful World',
    11:'Electricity',12:'Magnetic Effects of Electric Current',13:'Our Environment',
  };

  // Find the local PDF file for the selected chapter
  const findFile = ch => {
    const f = status?.available_local_pdfs?.find(p => p.chapter_number === ch);
    return f?.filename;
  };

  const load = async () => {
    if (!selectedChapter) return;
    const filename = findFile(Number(selectedChapter));
    if (!filename) { alert('Local PDF not found for this chapter.'); return; }
    setLoading(true); setPageIdx(0);
    try {
      const fd = new FormData();
      fd.append('local_filename', filename);
      fd.append('chapter_number', selectedChapter);
      const data = await api.uploadPDF(fd);
      setPages(data.page_extractions || []);
      setQuality(data.quality_report || {});
      setInfo(data);
    } catch (e) { alert(e.message); }
    finally { setLoading(false); }
  };

  const pg = pages[pageIdx] || null;

  const passCount = Object.values(quality).filter(q => q.status === 'PASS').length;
  const warnCount = Object.values(quality).filter(q => q.status === 'WARNING').length;
  const failCount = Object.values(quality).filter(q => q.status === 'FAILED').length;

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">

      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="text-xs text-warm-grey font-medium block mb-1">Select Chapter to Inspect</label>
          <select value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)} className="input-field">
            <option value="">— choose a chapter —</option>
            {chapters.map(ch => (
              <option key={ch} value={ch}>Ch. {ch} · {chapterNames[ch]}</option>
            ))}
          </select>
        </div>
        <button onClick={load} disabled={!selectedChapter || loading} className="btn-primary flex items-center gap-2">
          {loading ? 'Loading…' : 'Load Extraction'}
        </button>
        {chapters.length === 0 && (
          <p className="text-xs text-amber-600 w-full">No chapters indexed yet. Go to Document Upload first.</p>
        )}
      </div>

      {/* Quality report summary */}
      {pages.length > 0 && (
        <div className="card p-4">
          <p className="section-title mb-3">Extraction Quality Report — {info?.chapter_title}</p>
          <div className="flex flex-wrap gap-4 text-sm mb-3">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> {passCount} PASS</span>
            <span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> {warnCount} WARNING</span>
            <span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-500" /> {failCount} FAILED</span>
            <span className="text-warm-grey">· {info?.total_chunks_extracted} chunks extracted</span>
          </div>
          {/* Page quality chips */}
          <div className="flex flex-wrap gap-1.5">
            {pages.map((p, i) => {
              const q = quality[`Page_${p.page}`];
              const color = q?.status === 'PASS' ? 'bg-emerald-100 text-emerald-800'
                          : q?.status === 'WARNING' ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800';
              return (
                <button key={i} onClick={() => setPageIdx(i)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border font-medium transition-all ${color}
                    ${pageIdx === i ? 'ring-2 ring-offset-1 ring-sage' : 'opacity-70 hover:opacity-100'}`}>
                  P.{p.page}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Page viewer */}
      {pg && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Stats */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-forest text-sm">Page {pg.page} Metadata</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPageIdx(i => Math.max(0, i - 1))}
                  disabled={pageIdx === 0} className="btn-secondary !p-1">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-warm-grey px-1">{pageIdx + 1} / {pages.length}</span>
                <button onClick={() => setPageIdx(i => Math.min(pages.length - 1, i + 1))}
                  disabled={pageIdx === pages.length - 1} className="btn-secondary !p-1">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Page Number',       pg.page],
                ['Characters',        pg.char_count?.toLocaleString()],
                ['Chunks Created',    pg.chunks_count],
                ['Images Found',      pg.images_found],
                ['Status',            quality[`Page_${pg.page}`]?.status || '—'],
              ].map(([label, val]) => (
                <div key={label} className="bg-cream-200 rounded p-2">
                  <p className="text-warm-grey">{label}</p>
                  <p className="font-semibold text-forest">{val}</p>
                </div>
              ))}
            </div>

            {quality[`Page_${pg.page}`]?.issues?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 space-y-1">
                {quality[`Page_${pg.page}`].issues.map((iss, i) => (
                  <p key={i}>⚠ {iss}</p>
                ))}
              </div>
            )}
          </div>

          {/* Raw text */}
          <div className="card p-4 flex flex-col min-h-64">
            <p className="text-xs font-semibold text-warm-grey mb-2">Extracted Raw Text · Page {pg.page}</p>
            <pre className="flex-1 text-xs text-forest font-mono bg-cream-200 p-3 rounded-lg overflow-y-auto scrollbar-thin whitespace-pre-wrap leading-relaxed max-h-[480px]">
              {pg.raw_text || '(No text extracted on this page — likely an image-only page)'}
            </pre>
          </div>
        </div>
      )}

      {!loading && pages.length === 0 && (
        <div className="card p-10 text-center">
          <FileText size={36} className="text-warm-beige mx-auto mb-3" />
          <p className="text-sm text-warm-grey">Select a chapter and click Load Extraction to inspect extracted text.</p>
        </div>
      )}
    </div>
  );
}

