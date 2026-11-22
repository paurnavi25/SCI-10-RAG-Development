import { Settings, CheckCircle2, AlertCircle, Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function TopBar({ pageName }) {
  const { status, setCurrentPage, theme, toggleTheme } = useApp();

  const isOnline = status?.status === 'online';
  const isGeminiReady = isOnline && status?.gemini_configured && status?.gemini_connectivity === 'Connected';

  return (
    <header className="h-14 bg-cream-100 dark:bg-[#202823] border-b border-cream-400 dark:border-[#3B473E] flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      <div>
        <h1 className="page-title text-base sm:text-lg">{pageName}</h1>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-cream-400 dark:border-[#3B473E] bg-cream-200 dark:bg-[#2A352F] text-forest dark:text-[#F1F3EE] hover:bg-cream-300 dark:hover:bg-[#344037] transition-colors"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-forest" />}
        </button>

        <div
          onClick={() => setCurrentPage('settings')}
          className={`badge text-xs cursor-pointer ${
            !isOnline ? 'badge-red' : isGeminiReady ? 'badge-green' : 'badge-amber'
          }`}
          title="View system status"
        >
          {isGeminiReady ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
          {!isOnline
            ? 'Server Offline'
            : isGeminiReady
              ? `Gemini · ${status.llm_model}`
              : status?.gemini_configured
                ? `Gemini · ${status.gemini_connectivity || 'Checking'}`
                : 'AI Config Incomplete'}
        </div>

        <button
          onClick={() => setCurrentPage('settings')}
          className="btn-secondary flex items-center gap-1.5 !py-1.5 text-xs"
        >
          <Settings size={14} />
          <span>System Info</span>
        </button>
      </div>
    </header>
  );
}
