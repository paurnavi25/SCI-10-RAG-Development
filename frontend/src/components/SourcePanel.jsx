import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function SourcePanel({ chunks }) {
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (!chunks || chunks.length === 0) return null;

  // Deduplicate by chunk_id while preserving order
  const uniqueChunks = Array.from(
    new Map(chunks.map(c => [c.chunk_id || JSON.stringify(c), c])).values()
  );

  return (
    <div className="mt-2.5 border border-cream-400 dark:border-[#3B473E] rounded-xl bg-cream-200/70 dark:bg-[#202823] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-warm-grey dark:text-[#A7B2A9] hover:text-forest dark:hover:text-[#F1F3EE] hover:bg-cream-300/60 dark:hover:bg-[#2A352F] transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <BookOpen size={13} className="text-sage-dark dark:text-[#9BB99A] flex-shrink-0" />
          <span>
            Textbook Sources ({uniqueChunks.length}{' '}
            {uniqueChunks.length === 1 ? 'chunk' : 'chunks'} retrieved)
          </span>
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 pt-2 space-y-2 border-t border-cream-400/70 dark:border-[#3B473E]">
          <p className="text-[11px] text-warm-grey dark:text-[#8E9B90] leading-snug">
            This answer was grounded using the following passages retrieved from your NCERT Class 10 Science textbook:
          </p>

          {uniqueChunks.map((c, idx) => {
            const isExpanded = expandedIdx === idx;
            const scorePct = c.score != null ? Math.round(Math.max(0, Math.min(1, c.score)) * 100) : null;

            return (
              <div
                key={c.chunk_id || idx}
                className="bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-lg p-2.5 text-xs space-y-1.5"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-start sm:items-center justify-between gap-2 text-left"
                >
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <FileText size={12} className="text-sage-dark dark:text-[#9BB99A] flex-shrink-0" />
                    <span className="font-medium text-forest dark:text-[#F1F3EE]">
                      Chapter {c.chapter ?? '?'}
                      {c.chapter_title ? ` – ${c.chapter_title}` : ''}
                    </span>
                    {c.page != null && (
                      <span className="text-warm-grey dark:text-[#8E9B90]">· Page {c.page}</span>
                    )}
                    {c.chunk_id && (
                      <span className="mono-value text-[10px]">Chunk ID: {c.chunk_id}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {scorePct != null && (
                      <span className="badge badge-sage text-[10px]">
                        {scorePct}% match
                      </span>
                    )}
                    <span className="text-[11px] text-sage-dark dark:text-[#9BB99A] font-medium">
                      {isExpanded ? 'Hide text' : 'View text'}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="pt-2 border-t border-cream-300 dark:border-[#3B473E] space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-grey dark:text-[#8E9B90]">
                      Original Retrieved Textbook Passage
                    </p>
                    <p className="text-forest/90 dark:text-[#F1F3EE]/90 leading-relaxed whitespace-pre-wrap text-xs bg-cream-200/50 dark:bg-[#1E2520] p-2.5 rounded-lg border border-cream-300 dark:border-[#3B473E]">
                      {c.text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
