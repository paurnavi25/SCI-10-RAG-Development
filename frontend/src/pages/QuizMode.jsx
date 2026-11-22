import { useState } from 'react';
import {
  HelpCircle, Loader2, CheckCircle2, XCircle, RotateCcw,
  Award, AlertTriangle, ArrowRight, Sparkles
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

export default function QuizMode() {
  const {
    availableChapters,
    selectedChapter,
    setSelectedChapter,
    quizTopicSeed,
    setQuizTopicSeed,
    recordQuizResult,
    markChapterStudied,
    addLog,
    setCurrentPage,
  } = useApp();

  const [difficulty, setDifficulty] = useState('Medium');
  const [questionType, setQuestionType] = useState('MCQ');
  const [questionCount, setQuestionCount] = useState(5);
  const [topicInput, setTopicInput] = useState(quizTopicSeed || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [sources, setSources] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const selectedChapterObj = availableChapters.find(c => c.chapter_number === selectedChapter);

  const generateQuiz = async () => {
    setLoading(true);
    setError('');
    setQuestions([]);
    setSources([]);
    setCurrentIdx(0);
    setSelectedAnswer('');
    setSubmitted(false);
    setScore(0);
    setFinished(false);

    const chapterLabel = selectedChapterObj
      ? `Chapter ${selectedChapterObj.chapter_number}: ${selectedChapterObj.chapter_title}`
      : 'Class 10 NCERT Science textbook';

    const topicClause = topicInput.trim() ? ` focusing on: "${topicInput.trim()}"` : '';

    const typeInstruction =
      questionType === 'MCQ'
        ? 'All questions must have type "mcq" with 4 options.'
        : questionType === 'True/False'
          ? 'All questions must have type "tf" with options ["True", "False"].'
          : questionType === 'Short Answer'
            ? 'All questions must have type "short" with options [] and a concise 1-sentence answer.'
            : 'Mix "mcq" (4 options) and "tf" (["True", "False"]) questions.';

    const prompt = `Generate exactly ${questionCount} ${difficulty}-difficulty science quiz questions strictly based on the retrieved textbook context from ${chapterLabel}${topicClause}.
${typeInstruction}
Return ONLY a valid JSON array (no extra prose) where each item has:
{
  "type": "mcq" | "tf" | "short",
  "question": "...",
  "options": ["..."],
  "answer": "exact matching option text or concise expected answer",
  "explanation": "clear explanation grounded in the textbook"
}`;

    try {
      const res = await api.chat({ query: prompt, top_k: 5, context_window: 2 });
      const llm = res.llm ?? {};
      if (llm.success === false) {
        throw new Error(llm.error || 'Failed to generate quiz.');
      }
      const parsed = extractJsonArray(llm.answer);
      if (!parsed || parsed.length === 0) {
        throw new Error('Could not parse quiz questions from the AI response. Please try again.');
      }

      setQuestions(parsed);
      setSources(res.retrieval?.top_results ?? []);
      if (selectedChapter != null) markChapterStudied(selectedChapter);
      if (quizTopicSeed) setQuizTopicSeed(null);
      addLog('Quiz generated', 'success', `${parsed.length} ${difficulty} questions`);
    } catch (e) {
      setError(e.message || 'Unable to generate quiz.');
      addLog('Quiz generation failed', 'error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentQ = questions[currentIdx];

  const isAnswerCorrect = (q, ans) => {
    if (!q || !ans) return false;
    const normA = ans.trim().toLowerCase();
    const normExpected = String(q.answer || '').trim().toLowerCase();
    if (q.type === 'short') {
      return normA.length > 2 && (normExpected.includes(normA) || normA.includes(normExpected));
    }
    return normA === normExpected;
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer.trim() || submitted) return;
    setSubmitted(true);
    if (isAnswerCorrect(currentQ, selectedAnswer)) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
      recordQuizResult({
        chapter: selectedChapter,
        chapterTitle: selectedChapterObj?.chapter_title || 'Complete Textbook',
        difficulty,
        questionType,
        score,
        total: questions.length,
      });
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer('');
      setSubmitted(false);
    }
  };

  const handleRetrySameQuiz = () => {
    setCurrentIdx(0);
    setSelectedAnswer('');
    setSubmitted(false);
    setScore(0);
    setFinished(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest dark:text-[#F1F3EE] flex items-center gap-2.5 font-heading tracking-tight">
            <HelpCircle size={24} className="text-sage-dark dark:text-[#9BB99A]" />
            Quiz Mode
          </h2>
          <div className="w-10 h-1 bg-sage dark:bg-[#9BB99A] rounded-full mt-1.5" />
          <p className="text-xs sm:text-sm text-warm-grey dark:text-[#8E9B90] mt-1">
            Practice MCQs, True/False, and Short Answers generated directly from your NCERT textbook.
          </p>
        </div>
        <button onClick={() => setCurrentPage('chat')} className="btn-secondary text-xs">
          Back to Chat
        </button>
      </div>

      {/* Configuration Card */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-medium text-warm-grey block mb-1">Chapter</label>
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

          <div>
            <label className="text-[11px] font-medium text-warm-grey block mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="input-field text-xs"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-warm-grey block mb-1">Question Type</label>
            <select
              value={questionType}
              onChange={e => setQuestionType(e.target.value)}
              className="input-field text-xs"
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="True/False">True / False</option>
              <option value="Short Answer">Short Answer</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-warm-grey block mb-1">Questions</label>
            <select
              value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))}
              className="input-field text-xs"
            >
              {[3, 5, 8, 10].map(n => (
                <option key={n} value={n}>{n} Questions</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={topicInput}
            onChange={e => setTopicInput(e.target.value)}
            placeholder="Optional topic focus (e.g., displacement reactions, Ohm's law, nephron)..."
            className="input-field text-xs flex-1"
          />
          <button
            onClick={generateQuiz}
            disabled={loading}
            className="btn-primary text-xs inline-flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? 'Generating Quiz...' : 'Generate Quiz'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-start gap-2.5 text-xs text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Quiz Question */}
      {questions.length > 0 && !finished && currentQ && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-warm-grey border-b border-cream-300 pb-3">
            <span className="font-medium text-forest">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span className="badge badge-sage">
              Score: {score}/{currentIdx + (submitted ? 1 : 0)}
            </span>
          </div>

          <h3 className="text-base font-medium text-forest leading-relaxed">
            {currentQ.question}
          </h3>

          {currentQ.type === 'short' || !currentQ.options || currentQ.options.length === 0 ? (
            <input
              type="text"
              value={selectedAnswer}
              onChange={e => !submitted && setSelectedAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Type your short answer..."
              className="input-field"
            />
          ) : (
            <div className="space-y-2">
              {currentQ.options.map((opt, i) => {
                const isSelected = selectedAnswer === opt;
                const isCorrectOpt =
                  String(opt).trim().toLowerCase() === String(currentQ.answer).trim().toLowerCase();

                let style = 'bg-cream-200/60 border-cream-400 hover:bg-cream-300/70 text-forest';
                if (submitted) {
                  if (isCorrectOpt) {
                    style = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
                  } else if (isSelected && !isCorrectOpt) {
                    style = 'bg-red-50 border-red-300 text-red-800';
                  }
                } else if (isSelected) {
                  style = 'bg-sage/20 border-sage text-forest font-medium';
                }

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSelectedAnswer(opt)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center justify-between gap-2 ${style}`}
                  >
                    <span>{opt}</span>
                    {submitted && isCorrectOpt && <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />}
                    {submitted && isSelected && !isCorrectOpt && <XCircle size={16} className="text-red-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Explanation after submit */}
          {submitted && (
            <div
              className={`rounded-xl p-4 border text-xs space-y-1.5 ${
                isAnswerCorrect(currentQ, selectedAnswer)
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/80 border-amber-200 text-amber-900'
              }`}
            >
              <p className="font-semibold">
                {isAnswerCorrect(currentQ, selectedAnswer)
                  ? 'Correct!'
                  : `Correct Answer: ${currentQ.answer}`}
              </p>
              <p className="leading-relaxed">{currentQ.explanation}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {!submitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer.trim()}
                className="btn-primary text-xs"
              >
                Check Answer
              </button>
            ) : (
              <button onClick={handleNext} className="btn-primary text-xs inline-flex items-center gap-1.5">
                {currentIdx + 1 >= questions.length ? 'Finish Quiz' : 'Next Question'}
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Final Score Screen */}
      {finished && (
        <div className="card p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-sage/20 border border-sage/30 flex items-center justify-center">
            <Award size={24} className="text-sage-dark" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-forest">
              Quiz Complete!
            </h3>
            <p className="text-sm text-warm-grey">
              You scored <span className="font-bold text-forest">{score}</span> out of{' '}
              <span className="font-bold text-forest">{questions.length}</span> (
              {Math.round((score / questions.length) * 100)}%)
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button onClick={handleRetrySameQuiz} className="btn-secondary text-xs inline-flex items-center gap-1.5">
              <RotateCcw size={13} />
              Retry Quiz
            </button>
            <button onClick={generateQuiz} className="btn-primary text-xs inline-flex items-center gap-1.5">
              <Sparkles size={13} />
              New Questions
            </button>
          </div>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && <SourcePanel chunks={sources} />}
    </div>
  );
}
