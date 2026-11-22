import { useState } from 'react';
import {
  Layers, Loader2, ChevronLeft, ChevronRight, RotateCw,
  CheckCircle2, AlertCircle, AlertTriangle, Sparkles
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import SourcePanel from '../components/SourcePanel';

function extractJsonArray(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function FlashcardMode() {
  const {
    availableChapters,
    selectedChapter,
    setSelectedChapter,
    markChapterStudied,
    updateFlashcardStats,
    addLog,
    setCurrentPage,
  } = useApp();

  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);
  const [sources, setSources] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statuses, setStatuses] = useState({}); // { index: 'understood' | 'revision' }

  const selectedChapterObj = availableChapters.find(c => c.chapter_number === selectedChapter);

  const generateFlashcards = async () => {
    setLoading(true);
    setError('');
    setCards([]);
    setSources([]);
    setIdx(0);
    setFlipped(false);
    setStatuses({});

    const chapterLabel = selectedChapterObj
      ? `Chapter ${selectedChapterObj.chapter_number}: ${selectedChapterObj.chapter_title}`
      : 'Class 10 NCERT Science textbook';

    const prompt = `Create ${count} concise study flashcards strictly from the retrieved textbook content of ${chapterLabel}.
Return ONLY a valid JSON array (no extra text) where each item has:
{
  "front": "clear question, term, or scientific law",
  "back": "accurate, easy-to-remember textbook answer in 1-3 sentences"
}`;

    try {
      const res = await api.chat({ query: prompt, top_k: 5, context_window: 2 });
      const llm = res.llm ?? {};
      if (llm.success === false) {
        throw new Error(llm.error || 'Failed to generate flashcards.');
      }
      const parsed = extractJsonArray(llm.answer);
      if (!parsed || parsed.length === 0) {
        throw new Error('Could not parse flashcards from AI response. Please try again.');
      }

      setCards(parsed);
      setSources(res.retrieval?.top_results ?? []);
      if (selectedChapter != null) markChapterStudied(selectedChapter);
      addLog('Flashcards generated', 'success', `${parsed.length} cards`);
    } catch (e) {
      setError(e.message || 'Unable to generate flashcards.');
      addLog('Flashcard generation failed', 'error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const markCard = (status) => {
    const prev = statuses[idx];
    if (prev === status) return;

    let dUnderstood = 0;
    let dRevision = 0;
    if (prev === 'understood') dUnderstood -= 1;
    if (prev === 'revision') dRevision -= 1;
    if (status === 'understood') dUnderstood += 1;
    if (status === 'revision') dRevision += 1;

    updateFlashcardStats(dUnderstood, dRevision);
    setStatuses(s => ({ ...s, [idx]: status }));

    if (idx + 1 < cards.length) {
      setIdx(i => i + 1);
      setFlipped(false);
    }
  };

  const currentCard = cards[idx];
  const currentStatus = statuses[idx];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest dark:text-[#F1F3EE] flex items-center gap-2.5 font-heading tracking-tight">
            <Layers size={24} className="text-sage-dark dark:text-[#9BB99A]" />
            Flashcard Mode
          </h2>
          <div className="w-10 h-1 bg-sage dark:bg-[#9BB99A] rounded-full mt-1.5" />
          <p className="text-xs sm:text-sm text-warm-grey dark:text-[#8E9B90] mt-1">
            Flip cards to test your memory and track concepts you understand or need to revise.
          </p>
        </div>
        <button onClick={() => setCurrentPage('chat')} className="btn-secondary text-xs">
          Back to Chat
        </button>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-warm-grey block mb-1">Filter by Chapter</label>
          <select
            value={selectedChapter ?? ''}
            onChange={e => setSelectedChapter(e.target.value ? Number(e.target.value) : null)}
            className="input-field text-xs"
          >
            <option value="">All Chapters</option>
            {availableChapters.map(ch => (
              <option key={ch.chapter_number} value={ch.chapter_number}>
                Ch.{ch.chapter_number}: {ch.chapter_title}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-36">
          <label className="text-[11px] font-medium text-warm-grey block mb-1">Deck Size</label>
          <select
            value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="input-field text-xs"
          >
            {[4, 6, 8, 10].map(n => (
              <option key={n} value={n}>{n} Cards</option>
            ))}
          </select>
        </div>

        <button
          onClick={generateFlashcards}
          disabled={loading}
          className="btn-primary text-xs inline-flex items-center justify-center gap-1.5"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Creating Deck...' : 'Generate Flashcards'}
        </button>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-start gap-2.5 text-xs text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Flashcard Viewer */}
      {currentCard && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-warm-grey">
            <span>Card {idx + 1} of {cards.length}</span>
            <div className="flex items-center gap-2">
              {currentStatus === 'understood' && <span className="badge badge-green">Understood</span>}
              {currentStatus === 'revision' && <span className="badge badge-amber">Needs Revision</span>}
            </div>
          </div>

          {/* Card */}
          <div
            onClick={() => setFlipped(f => !f)}
            className="card p-8 min-h-[220px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-sage transition-all select-none space-y-3"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sage-dark">
              {flipped ? 'Answer' : 'Question · Click to Flip'}
            </span>
            <p className="text-base sm:text-lg font-medium text-forest leading-relaxed max-w-xl">
              {flipped ? currentCard.back : currentCard.front}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] text-warm-grey pt-2">
              <RotateCw size={12} />
              Click card to {flipped ? 'see question' : 'reveal answer'}
            </span>
          </div>

          {/* Navigation + Mark buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }}
                disabled={idx === 0}
                className="btn-secondary text-xs inline-flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
                disabled={idx + 1 >= cards.length}
                className="btn-secondary text-xs inline-flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => markCard('revision')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors ${
                  currentStatus === 'revision'
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-cream-100 border-cream-400 text-warm-grey hover:text-forest'
                }`}
              >
                <AlertCircle size={13} /> Needs Revision
              </button>
              <button
                onClick={() => markCard('understood')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition-colors ${
                  currentStatus === 'understood'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                    : 'bg-cream-100 border-cream-400 text-forest hover:bg-cream-200'
                }`}
              >
                <CheckCircle2 size={13} className="text-emerald-600" /> Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {sources.length > 0 && <SourcePanel chunks={sources} />}
    </div>
  );
}

