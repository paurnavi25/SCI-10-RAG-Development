import { BarChart3, Award, BookOpen, Bookmark, Layers, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function StudyProgress() {
  const { studyProgress, availableChapters, removeSavedAnswer, setCurrentPage } = useApp();

  const { quizHistory, studiedChapters, flashcardStats, savedAnswers } = studyProgress;

  const avgScore =
    quizHistory.length > 0
      ? Math.round(
          (quizHistory.reduce((acc, q) => acc + (q.total > 0 ? q.score / q.total : 0), 0) /
            quizHistory.length) *
            100
        )
      : null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest dark:text-[#F1F3EE] flex items-center gap-2.5 font-heading tracking-tight">
            <BarChart3 size={24} className="text-sage-dark dark:text-[#9BB99A]" />
            Study Progress
          </h2>
          <div className="w-10 h-1 bg-sage dark:bg-[#9BB99A] rounded-full mt-1.5" />
          <p className="text-xs sm:text-sm text-warm-grey dark:text-[#8E9B90] mt-1">
            Your real learning activity saved locally in this browser.
          </p>
        </div>
        <button onClick={() => setCurrentPage('chat')} className="btn-secondary text-xs">
          Back to Chat
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <div className="flex items-center justify-between text-warm-grey">
            <span className="stat-label">Quizzes Completed</span>
            <Award size={15} className="text-sage-dark" />
          </div>
          <span className="stat-value">{quizHistory.length}</span>
          <span className="text-[11px] text-warm-grey">
            {avgScore != null ? `Avg score: ${avgScore}%` : 'No quizzes yet'}
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-warm-grey">
            <span className="stat-label">Studied Chapters</span>
            <BookOpen size={15} className="text-sage-dark" />
          </div>
          <span className="stat-value">{studiedChapters.length}</span>
          <span className="text-[11px] text-warm-grey">
            of {availableChapters.length || 0} available
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-warm-grey">
            <span className="stat-label">Flashcards Mastered</span>
            <Layers size={15} className="text-sage-dark" />
          </div>
          <span className="stat-value">{flashcardStats?.understood ?? 0}</span>
          <span className="text-[11px] text-warm-grey">
            {flashcardStats?.needsRevision ?? 0} need revision
          </span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between text-warm-grey">
            <span className="stat-label">Saved Answers</span>
            <Bookmark size={15} className="text-sage-dark" />
          </div>
          <span className="stat-value">{savedAnswers.length}</span>
          <span className="text-[11px] text-warm-grey">Notes & explanations</span>
        </div>
      </div>

      {/* Quiz History */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-forest">Recent Quiz Scores</h3>
        {quizHistory.length === 0 ? (
          <p className="text-xs text-warm-grey">
            You haven’t completed a quiz yet. Try{' '}
            <button onClick={() => setCurrentPage('quiz')} className="underline text-forest font-medium">
              Quiz Mode
            </button>{' '}
            to track your scores!
          </p>
        ) : (
          <div className="space-y-2">
            {quizHistory.map(q => (
              <div
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-cream-200/70 border border-cream-400 text-xs"
              >
                <div>
                  <p className="font-medium text-forest">
                    {q.chapter != null ? `Chapter ${q.chapter}: ${q.chapterTitle}` : q.chapterTitle}
                  </p>
                  <p className="text-[11px] text-warm-grey">
                    {q.difficulty} · {q.questionType} · {new Date(q.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge badge-sage font-mono">
                  {q.score} / {q.total} ({Math.round((q.score / q.total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Answers */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-forest">Saved Answers & Notes</h3>
        {savedAnswers.length === 0 ? (
          <p className="text-xs text-warm-grey">
            Click “Save Answer” on any AI Tutor response or Smart Note to bookmark it here for revision.
          </p>
        ) : (
          <div className="space-y-3">
            {savedAnswers.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-cream-200/60 border border-cream-400 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-forest">{item.question}</p>
                    <p className="text-[10px] text-warm-grey">
                      {item.chapter != null ? `Chapter ${item.chapter} · ` : ''}
                      Saved {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeSavedAnswer(item.id)}
                    className="p-1 text-warm-grey hover:text-red-600"
                    title="Remove saved answer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-xs text-forest/90 leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

