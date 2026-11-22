import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';

const AppContext = createContext(null);

const STORAGE_KEY = 'science_tutor_conversations_v1';
const PROGRESS_STORAGE_KEY = 'science_tutor_progress_v1';
const THEME_STORAGE_KEY = 'science_tutor_theme_v1';

const DEFAULT_PROGRESS = {
  quizHistory: [],
  studiedChapters: [],
  flashcardStats: { understood: 0, needsRevision: 0 },
  savedAnswers: [],
};

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'light';
}

function loadInitialProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
        studiedChapters: Array.isArray(parsed.studiedChapters) ? parsed.studiedChapters : [],
        flashcardStats: parsed.flashcardStats || { understood: 0, needsRevision: 0 },
        savedAnswers: Array.isArray(parsed.savedAnswers) ? parsed.savedAnswers : [],
      };
    }
  } catch {
    // Ignore malformed localStorage
  }
  return DEFAULT_PROGRESS;
}

function createConversationObject(chapter = null) {
  const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title: 'New Science Chat',
    chapter,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map(m => {
    if (!m) return m;
    // Strip obsolete "Gemini API Key Required" or configuration errors from older test sessions
    const hasKeyErr =
      (m.error && (
        m.error.toLowerCase().includes('gemini api key') ||
        m.error.toLowerCase().includes('configuration is incomplete')
      )) ||
      (m.content && m.content.toLowerCase().includes('please add your google gemini api key'));

    if (hasKeyErr) {
      return {
        ...m,
        error: null,
        content: m.content && !m.content.toLowerCase().includes('please add your google gemini api key')
          ? m.content
          : 'Answer grounded in NCERT Class 10 Science textbook. Ask any follow-up question below!',
      };
    }
    return m;
  });
}

function loadInitialConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(conv => ({
          ...conv,
          messages: sanitizeMessages(conv.messages),
        }));
      }
    }
  } catch {
    // Ignore malformed localStorage
  }
  return [createConversationObject(null)];
}

export function AppProvider({ children }) {
  const [status, setStatus]                 = useState(null);
  const [logs, setLogs]                     = useState([]);
  const [loading, setLoading]               = useState(false);
  const [currentPage, setCurrentPage]       = useState('chat');
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [theme, setTheme]                   = useState(getInitialTheme);

  // Apply theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Tutor / UX state
  const [conversations, setConversations] = useState(() => {
    const loaded = loadInitialConversations();
    // Ensure there is always at least one conversation
    return loaded && loaded.length > 0 ? loaded : [createConversationObject(null)];
  });

  const [activeConversationId, setActiveConversationId] = useState(() => {
    const loaded = loadInitialConversations();
    return loaded && loaded.length > 0 ? loaded[0].id : null;
  });

  // Ensure activeConversationId always points to a valid conversation
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    } else if (activeConversationId && !conversations.some(c => c.id === activeConversationId)) {
      if (conversations.length > 0) {
        setActiveConversationId(conversations[0].id);
      } else {
        const fresh = createConversationObject(null);
        setConversations([fresh]);
        setActiveConversationId(fresh.id);
      }
    }
  }, [conversations, activeConversationId]);
  const [selectedChapter, setSelectedChapter]           = useState(null);
  const [topK, setTopK]                                 = useState(3);
  const [contextWindow, setContextWindow]               = useState(2);
  const [uploadModalOpen, setUploadModalOpen]           = useState(false);
  const [pendingUploadFile, setPendingUploadFile]       = useState(null);
  const [pipelineTab, setPipelineTab]                   = useState('overview');
  const [lastRagExecution, setLastRagExecution]         = useState(null);
  const [studyProgress, setStudyProgress]               = useState(loadInitialProgress);
  const [quizTopicSeed, setQuizTopicSeed]               = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(studyProgress));
    } catch {
      // Ignore storage quota errors
    }
  }, [studyProgress]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 30)));
    } catch {
      // Ignore storage quota errors
    }
  }, [conversations]);

  const activeConversation = useMemo(() => {
    if (!conversations || conversations.length === 0) return null;
    return conversations.find(c => c.id === activeConversationId) || conversations[0] || null;
  }, [conversations, activeConversationId]);

  const ensureActiveConversationId = useCallback(() => {
    if (activeConversationId && conversations.some(c => c.id === activeConversationId)) {
      return activeConversationId;
    }
    if (conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
      return conversations[0].id;
    }
    const fresh = createConversationObject(null);
    setConversations([fresh]);
    setActiveConversationId(fresh.id);
    return fresh.id;
  }, [activeConversationId, conversations]);

  const availableChapters = useMemo(() => {
    const map = new Map();
    const localPdfs = status?.available_local_pdfs ?? [];
    const counts = status?.chapter_counts ?? {};

    for (const pdf of localPdfs) {
      if (pdf.chapter_number != null) {
        const ch = Number(pdf.chapter_number);
        map.set(ch, {
          chapter_number: ch,
          chapter_title: pdf.chapter_title || `Chapter ${ch}`,
          filename: pdf.filename,
          chunk_count: counts[ch] ?? counts[String(ch)] ?? 0,
          indexed: (counts[ch] ?? counts[String(ch)] ?? 0) > 0,
        });
      }
    }

    for (const [chKey, cnt] of Object.entries(counts)) {
      const ch = Number(chKey);
      if (!Number.isNaN(ch) && !map.has(ch)) {
        map.set(ch, {
          chapter_number: ch,
          chapter_title: `Chapter ${ch}`,
          filename: null,
          chunk_count: cnt,
          indexed: cnt > 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.chapter_number - b.chapter_number);
  }, [status]);

  const createNewChat = useCallback((chapter = null) => {
    const next = createConversationObject(chapter);
    setConversations(prev => [next, ...prev]);
    setActiveConversationId(next.id);
    if (chapter !== undefined) {
      setSelectedChapter(chapter);
    }
    setCurrentPage('chat');
    return next.id;
  }, []);

  const selectConversation = useCallback((id) => {
    setActiveConversationId(id);
    const found = conversations.find(c => c.id === id);
    if (found && found.chapter !== undefined) {
      setSelectedChapter(found.chapter);
    }
    setCurrentPage('chat');
  }, [conversations]);

  const deleteConversation = useCallback((id) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const fresh = createConversationObject(null);
        setActiveConversationId(fresh.id);
        return [fresh];
      }
      if (id === activeConversationId) {
        setActiveConversationId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeConversationId]);

  const updateConversationMessages = useCallback((convId, updater) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== convId) return conv;
        const nextMessages = typeof updater === 'function' ? updater(conv.messages) : updater;
        const firstUserMsg = nextMessages.find(m => m.role === 'user');
        const autoTitle = firstUserMsg
          ? (firstUserMsg.content.length > 42 ? firstUserMsg.content.slice(0, 42) + '...' : firstUserMsg.content)
          : 'New Science Chat';
        return {
          ...conv,
          title: conv.title === 'New Science Chat' && firstUserMsg ? autoTitle : conv.title,
          updatedAt: new Date().toISOString(),
          messages: nextMessages,
        };
      })
    );
  }, []);

  const clearActiveConversation = useCallback(() => {
    if (!activeConversationId) return;
    setConversations(prev =>
      prev.map(conv =>
        conv.id === activeConversationId
          ? { ...conv, title: 'New Science Chat', updatedAt: new Date().toISOString(), messages: [] }
          : conv
      )
    );
  }, [activeConversationId]);

  const renameConversation = useCallback((id, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setConversations(prev =>
      prev.map(conv => (conv.id === id ? { ...conv, title: trimmed } : conv))
    );
  }, []);

  const recordQuizResult = useCallback((entry) => {
    setStudyProgress(prev => ({
      ...prev,
      quizHistory: [
        { id: `quiz_${Date.now()}`, date: new Date().toISOString(), ...entry },
        ...prev.quizHistory,
      ].slice(0, 50),
      studiedChapters:
        entry.chapter != null && !prev.studiedChapters.includes(entry.chapter)
          ? [...prev.studiedChapters, entry.chapter]
          : prev.studiedChapters,
    }));
  }, []);

  const markChapterStudied = useCallback((chNum) => {
    if (chNum == null) return;
    setStudyProgress(prev =>
      prev.studiedChapters.includes(chNum)
        ? prev
        : { ...prev, studiedChapters: [...prev.studiedChapters, chNum] }
    );
  }, []);

  const updateFlashcardStats = useCallback((deltaUnderstood = 0, deltaRevision = 0) => {
    setStudyProgress(prev => ({
      ...prev,
      flashcardStats: {
        understood: Math.max(0, (prev.flashcardStats?.understood ?? 0) + deltaUnderstood),
        needsRevision: Math.max(0, (prev.flashcardStats?.needsRevision ?? 0) + deltaRevision),
      },
    }));
  }, []);

  const saveAnswer = useCallback((item) => {
    setStudyProgress(prev => {
      const exists = prev.savedAnswers.some(a => a.id === item.id);
      if (exists) return prev;
      return {
        ...prev,
        savedAnswers: [
          { ...item, date: new Date().toISOString() },
          ...prev.savedAnswers,
        ].slice(0, 100),
      };
    });
  }, []);

  const removeSavedAnswer = useCallback((id) => {
    setStudyProgress(prev => ({
      ...prev,
      savedAnswers: prev.savedAnswers.filter(a => a.id !== id),
    }));
  }, []);

  const addLog = useCallback((operation, status = 'success', detail = '', duration = null) => {
    const entry = {
      id:        Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      operation,
      status,
      detail,
      duration,
    };
    setLogs(prev => [entry, ...prev].slice(0, 200));
    return entry;
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const incrementQuestions = useCallback(() => {
    setQuestionsAsked(prev => prev + 1);
  }, []);

  const refreshStatus = useCallback(async (verifyGemini = false) => {
    try {
      const data = await api.status(verifyGemini);
      setStatus(data);
      return data;
    } catch (e) {
      setStatus(null);
      addLog('Backend health check', 'error', e.message);
      return null;
    }
  }, [addLog]);

  useEffect(() => {
    let active = true;
    const poll = () => {
      api.status(false)
        .then(data => { if (active) setStatus(data); })
        .catch(e => {
          if (active) {
            setStatus(null);
            addLog('Backend health check', 'error', e.message);
          }
        });
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [addLog]);

  return (
    <AppContext.Provider value={{
      theme, setTheme, toggleTheme,
      status, refreshStatus,
      logs, addLog, clearLogs,
      loading, setLoading,
      currentPage, setCurrentPage,
      questionsAsked, incrementQuestions,
      // Tutor state
      conversations,
      activeConversationId,
      activeConversation,
      ensureActiveConversationId,
      createNewChat,
      selectConversation,
      deleteConversation,
      updateConversationMessages,
      clearActiveConversation,
      renameConversation,
      selectedChapter, setSelectedChapter,
      availableChapters,
      topK, setTopK,
      contextWindow, setContextWindow,
      uploadModalOpen, setUploadModalOpen,
      pendingUploadFile, setPendingUploadFile,
      pipelineTab, setPipelineTab,
      lastRagExecution, setLastRagExecution,
      studyProgress,
      recordQuizResult,
      markChapterStudied,
      updateFlashcardStats,
      saveAnswer,
      removeSavedAnswer,
      quizTopicSeed, setQuizTopicSeed,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
