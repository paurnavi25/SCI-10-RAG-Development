import { useState } from 'react';
import {
  FileText, Loader2, Sparkles, Copy, Check, Bookmark, AlertTriangle
} from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import SourcePanel from '../components/SourcePanel';

const NOTE_TYPES = [
  { id: 'summary', label: 'Chapter Summary', instruction: 'Write a clear, structured chapter summary with headings and bullet points.' },
  { id: 'definitions', label: 'Important Definitions', instruction: 'List all important scientific definitions from this chapter clearly.' },
  { id: 'laws', label: 'Scientific Laws', instruction: 'List and explain the important scientific laws and principles covered.' },
  { id: 'formulas', label: 'Formulas & Equations', instruction: 'List all important chemical equations and physics formulas with units/meanings.' },
  { id: 'concepts', label: 'Key Concepts', instruction: 'Break down the core concepts a Class 10 student must understand.' },
  { id: 'revision', label: 'Exam Revision Points', instruction: 'Create high-yield last-minute board exam revision bullet points.' },
];

export default function SmartNotes() {
  const {
    availableChapters,
    selectedChapter,
    setSelectedChapter,
    markChapterStudied,
    saveAnswer,
    studyProgress,
    addLog,
    setCurrentPage,
  } = useApp();

  const [noteType, setNoteType] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [sources, setSources] = useState([]);
  const [copied, setCopied] = useState(false);
  const [noteId, setNoteId] = useState(null);

  const selectedChapterObj = availableChapters.find(c => c.chapter_number === selectedChapter);
  const activeTypeObj = NOTE_TYPES.find(t => t.id === noteType) || NOTE_TYPES[0];

  const generateNotes = async (typeId = noteType) => {
    const tObj = NOTE_TYPES.find(t => t.id === typeId) || NOTE_TYPES[0];
    setNoteType(typeId);
    setLoading(true);
    setError('');
    setContent('');
    setSources([]);

    const chapterLabel = selectedChapterObj
      ? `Chapter ${selectedChapterObj.chapter_number}: ${selectedChapterObj.chapter_title}`
      : 'Class 10 NCERT Science textbook';

    const prompt = `Based strictly on the retrieved textbook content from ${chapterLabel}, ${tObj.instruction} Use clean markdown headings and bullet points.`;

    try {
      const res = await api.chat({ query: prompt, top_k: 5, context_window: 2 });
      const llm = res.llm ?? {};
      if (llm.success === false) {
        throw new Error(llm.error || 'Failed to generate notes.');
      }
      setContent(llm.answer || '');
      setSources(res.retrieval?.top_results ?? []);
      setNoteId(`note_${Date.now()}`);
      if (selectedChapter != null) markChapterStudied(selectedChapter);
      addLog(`Smart Notes (${tObj.label})`, 'success', chapterLabel);
    } catch (e) {
      setError(e.message || 'Unable to generate smart notes.');
      addLog('Smart Notes failed', 'error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const isSaved = noteId && studyProgress.savedAnswers.some(a => a.id === noteId);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest dark:text-[#F1F3EE] flex items-center gap-2.5 font-heading tracking-tight">
            <FileText size={24} className="text-sage-dark dark:text-[#9BB99A]" />
            Smart Notes
          </h2>
          <div className="w-10 h-1 bg-sage dark:bg-[#9BB99A] rounded-full mt-1.5" />
          <p className="text-xs sm:text-sm text-warm-grey dark:text-[#8E9B90] mt-1">
            Generate structured summaries, definitions, laws, formulas, and exam revision sheets from your textbook.
          </p>
        </div>
        <button onClick={() => setCurrentPage('chat')} className="btn-secondary text-xs">
          Back to Chat
        </button>
      </div>

      {/* Controls */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-warm-grey block mb-1">Select Chapter</label>
            <select
              value={selectedChapter ?? ''}
              onChange={e => setSelectedChapter(e.target.value ? Number(e.target.value) : null)}
              className="input-field text-xs"
            >
              <option value="">All Chapters (General Science)</option>
              {availableChapters.map(ch => (
                <option key={ch.chapter_number} value={ch.chapter_number}>
                  Ch.{ch.chapter_number}: {ch.chapter_title}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => generateNotes(noteType)}
            disabled={loading}
            className="btn-primary text-xs inline-flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating...' : `Generate ${activeTypeObj.label}`}
          </button>
        </div>

        {/* Note type tabs */}
        <div className="flex flex-wrap gap-1.5">
          {NOTE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => generateNotes(t.id)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                noteType === t.id
                  ? 'bg-forest text-cream-100 border-forest'
                  : 'bg-cream-200/70 text-forest border-cream-400 hover:bg-cream-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-start gap-2.5 text-xs text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Output */}
      {content && (
        <div className="space-y-3">
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-cream-300">
              <div>
                <h3 className="text-sm font-semibold text-forest">{activeTypeObj.label}</h3>
                <p className="text-[11px] text-warm-grey">
                  {selectedChapterObj
                    ? `Chapter ${selectedChapterObj.chapter_number}: ${selectedChapterObj.chapter_title}`
                    : 'Complete Textbook'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="btn-secondary !py-1 !px-2.5 text-xs inline-flex items-center gap-1"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() =>
                    saveAnswer({
                      id: noteId,
                      question: `${activeTypeObj.label} (${selectedChapterObj ? `Ch.${selectedChapterObj.chapter_number}` : 'All Chapters'})`,
                      answer: content,
                      chapter: selectedChapter,
                      sources: sources.map(c => ({
                        chapter: c.chapter,
                        chapter_title: c.chapter_title,
                        page: c.page,
                        chunk_id: c.chunk_id,
                      })),
                    })
                  }
                  className={`!py-1 !px-2.5 text-xs inline-flex items-center gap-1 rounded-lg border transition-colors ${
                    isSaved
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'btn-secondary'
                  }`}
                >
                  <Bookmark size={12} />
                  {isSaved ? 'Saved' : 'Save Note'}
                </button>
              </div>
            </div>

            <div className="text-sm text-forest leading-relaxed whitespace-pre-wrap">
              {content}
            </div>
          </div>

          <SourcePanel chunks={sources} />
        </div>
      )}
    </div>
  );
}

