import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import SidebarNew from './components/SidebarNew';
import TopBar from './components/TopBar';
import UploadModal from './components/UploadModal';
import ChatHome from './pages/ChatHome';
import QuizMode from './pages/QuizMode';
import FlashcardMode from './pages/FlashcardMode';
import SmartNotes from './pages/SmartNotes';
import StudyProgress from './pages/StudyProgress';
import SettingsPage from './pages/Settings';
import Overview from './pages/Overview';
import DocumentUpload from './pages/DocumentUpload';
import TextExtraction from './pages/TextExtraction';
import ChunkExplorer from './pages/ChunkExplorer';
import EmbeddingsPage from './pages/EmbeddingsPage';
import VectorStore from './pages/VectorStore';
import RetrievalInspector from './pages/RetrievalInspector';
import AIChatbot from './pages/AIChatbot';
import PipelineLogs from './pages/PipelineLogs';
import { ArrowLeft, Menu } from 'lucide-react';

const PAGE_NAMES = {
  chat:       'Science AI Tutor',
  quiz:       'Quiz Mode',
  flashcards: 'Flashcard Mode',
  notes:      'Smart Notes',
  progress:   'Study Progress',
  pipeline:   'Pipeline Explorer',
  overview:   'Overview',
  upload:     'Document Upload',
  extraction: 'Text Extraction',
  chunks:     'Chunk Explorer',
  embeddings: 'Embeddings',
  vectors:    'Vector Store',
  retrieval:  'Retrieval Inspector',
  chatbot:    'AI Chatbot (Legacy)',
  logs:       'Pipeline Logs',
  settings:   'Settings',
};

const PIPELINE_TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'upload',     label: 'Document Processing' },
  { id: 'extraction', label: 'Text Extraction' },
  { id: 'chunks',     label: 'Chunk Explorer' },
  { id: 'embeddings', label: 'Embedding Explorer' },
  { id: 'vectors',    label: 'Vector Store' },
  { id: 'retrieval',  label: 'Retrieval Inspector' },
  { id: 'chatbot',    label: 'AI Chatbot' },
  { id: 'logs',       label: 'Pipeline Logs' },
];

const TECHNICAL_PAGES = {
  overview:   Overview,
  upload:     DocumentUpload,
  extraction: TextExtraction,
  chunks:     ChunkExplorer,
  embeddings: EmbeddingsPage,
  vectors:    VectorStore,
  retrieval:  RetrievalInspector,
  chatbot:    AIChatbot,
  logs:       PipelineLogs,
};

const LEARNING_PAGES = {
  quiz:       QuizMode,
  flashcards: FlashcardMode,
  notes:      SmartNotes,
  progress:   StudyProgress,
};

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    currentPage,
    setCurrentPage,
    pipelineTab,
    setPipelineTab,
  } = useApp();

  const isChatPage = currentPage === 'chat';
  const LearningPage = LEARNING_PAGES[currentPage] || null;
  const activeTechnicalId = currentPage === 'pipeline' ? pipelineTab : currentPage;
  const TechnicalPage = TECHNICAL_PAGES[activeTechnicalId] || Overview;
  const isPipelinePage = !isChatPage && !LearningPage && currentPage !== 'settings';

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNew
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {isChatPage ? (
          <main className="flex-1 overflow-hidden flex flex-col min-h-0">
            <ChatHome onOpenMobileSidebar={() => setMobileOpen(true)} />
          </main>
        ) : (
          <>
            <TopBar pageName={PAGE_NAMES[currentPage] || 'Science AI Tutor'} />

            {/* Sub-header navigation bar */}
            <div className="bg-cream-200/80 border-b border-cream-400 px-4 sm:px-6 py-2 flex items-center gap-3 overflow-x-auto scrollbar-thin flex-shrink-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-1.5 rounded-lg text-forest hover:bg-cream-300 flex-shrink-0"
                aria-label="Open menu"
              >
                <Menu size={16} />
              </button>
              <button
                onClick={() => setCurrentPage('chat')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-forest bg-cream-100 hover:bg-cream-300 border border-cream-400 px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
              >
                <ArrowLeft size={12} />
                Back to AI Tutor
              </button>

              {isPipelinePage && (
                <div className="flex items-center gap-1">
                  {PIPELINE_TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setPipelineTab(tab.id);
                        setCurrentPage('pipeline');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        activeTechnicalId === tab.id
                          ? 'bg-forest text-cream-100'
                          : 'text-warm-grey hover:text-forest hover:bg-cream-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <main className="flex-1 overflow-y-auto scrollbar-thin">
              {LearningPage ? (
                <LearningPage />
              ) : currentPage === 'settings' ? (
                <SettingsPage />
              ) : (
                <TechnicalPage />
              )}
            </main>
          </>
        )}
      </div>

      {/* Global Upload PDF Modal */}
      <UploadModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
}
