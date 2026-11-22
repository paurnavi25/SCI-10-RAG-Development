import { useState, useMemo } from 'react';
import {
  Plus, Search, MessageSquare, BookOpen, Upload,
  Wrench, Settings, ChevronLeft, ChevronRight, Trash2,
  Circle, ChevronDown, ChevronUp, X, Pencil, Check,
  HelpCircle, Layers, FileText, BarChart3, Sun, Moon, AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import ScienceLogo from './ScienceLogo';

const LEARNING_TOOLS = [
  { id: 'quiz', label: 'Quiz Mode', icon: HelpCircle },
  { id: 'flashcards', label: 'Flashcards', icon: Layers },
  { id: 'notes', label: 'Smart Notes', icon: FileText },
  { id: 'progress', label: 'Study Progress', icon: BarChart3 },
];

export default function SidebarNew({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const {
    status,
    currentPage,
    setCurrentPage,
    conversations,
    activeConversationId,
    createNewChat,
    selectConversation,
    deleteConversation,
    renameConversation,
    availableChapters,
    selectedChapter,
    setSelectedChapter,
    markChapterStudied,
    setUploadModalOpen,
    theme,
    toggleTheme,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const online = status?.status === 'online';

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = conversations.filter(c => c.messages.length > 0 || c.id === activeConversationId);
    if (!q) return list;
    return list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.messages.some(m => m.content?.toLowerCase().includes(q))
    );
  }, [conversations, activeConversationId, searchQuery]);

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleSelectChapter = (chNum) => {
    setSelectedChapter(chNum);
    if (chNum != null) markChapterStudied(chNum);
    setCurrentPage('chat');
    closeMobile();
  };

  const handleNewChat = () => {
    createNewChat(selectedChapter);
    closeMobile();
  };

  const handleSelectConv = (id) => {
    if (editingId === id) return;
    selectConversation(id);
    closeMobile();
  };

  const startRename = (e, conv) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const commitRename = (e, id) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim()) {
      renameConversation(id, editingTitle);
    }
    setEditingId(null);
  };

  const handleOpenUpload = () => {
    setUploadModalOpen(true);
    closeMobile();
  };

  const handleNav = (pageId) => {
    setCurrentPage(pageId);
    closeMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-cream-100 dark:bg-[#202823] border-r border-cream-400 dark:border-[#3B473E]">
      {/* Brand header */}
      <div className="flex items-center justify-between px-3.5 pt-4 pb-3 border-b border-cream-400 dark:border-[#3B473E]">
        <button
          onClick={() => handleNav('chat')}
          className="flex items-center gap-2.5 min-w-0 text-left"
        >
          <ScienceLogo size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-forest dark:text-[#F1F3EE] leading-tight tracking-wide truncate font-heading">
                Science <span className="font-serif font-bold italic text-sage-dark dark:text-[#9BB99A]">AI</span> Tutor
              </p>
              <p className="text-[10px] text-warm-grey dark:text-[#8E9B90] leading-tight truncate">
                Class 10 NCERT
              </p>
            </div>
          )}
        </button>

        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={toggleTheme}
              className="p-1 rounded-lg text-warm-grey dark:text-[#A7B2A9] hover:text-forest dark:hover:text-[#F1F3EE] hover:bg-cream-300 dark:hover:bg-[#303B33] transition-colors"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
            </button>
          )}

          {mobileOpen ? (
            <button
              onClick={closeMobile}
              className="md:hidden p-1.5 rounded-lg text-warm-grey hover:text-forest hover:bg-cream-300 dark:hover:bg-[#303B33]"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-warm-grey dark:text-[#A7B2A9] hover:text-forest dark:hover:text-[#F1F3EE] hover:bg-cream-300 dark:hover:bg-[#303B33] transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Primary Action: New Chat + Search */}
      <div className="p-2.5 space-y-2">
        <button
          onClick={handleNewChat}
          title="New Chat"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold bg-forest dark:bg-[#9BB99A] text-cream-100 dark:text-[#171C19] hover:bg-forest-light dark:hover:bg-[#85A884] transition-all shadow-sm ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <Plus size={15} className="flex-shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </button>

        {!collapsed && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-beige dark:text-[#6C7B70]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-cream-200 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-forest dark:text-[#F1F3EE] placeholder:text-warm-beige dark:placeholder:text-[#6C7B70] focus:outline-none focus:ring-1 focus:ring-sage"
            />
          </div>
        )}
      </div>

      {/* Scrollable Middle */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4 scrollbar-thin">
        {/* Chat History */}
        <div>
          {!collapsed && (
            <p className="px-2 mb-1.5 text-[10px] font-bold text-warm-grey dark:text-[#8E9B90] uppercase tracking-wider">
              Chat History
            </p>
          )}
          <div className="space-y-0.5">
            {filteredConversations.length === 0 ? (
              !collapsed && (
                <p className="px-2 py-1.5 text-[11px] text-warm-beige dark:text-[#6C7B70] italic">
                  No matching chats
                </p>
              )
            ) : (
              filteredConversations.map(conv => {
                const isActive = currentPage === 'chat' && conv.id === activeConversationId;
                const isEditing = editingId === conv.id;
                const isConfirmingDelete = deletingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-cream-300 dark:bg-[#303B33] text-forest dark:text-[#F1F3EE] font-medium'
                        : 'text-warm-grey dark:text-[#A7B2A9] hover:bg-cream-200 dark:hover:bg-[#252F29] hover:text-forest dark:hover:text-[#F1F3EE]'
                    } ${collapsed ? 'justify-center' : ''}`}
                    onClick={() => handleSelectConv(conv.id)}
                    title={collapsed ? conv.title : undefined}
                  >
                    <MessageSquare size={14} className="flex-shrink-0" />
                    {!collapsed && (
                      isEditing ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRename(e, conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="flex-1 min-w-0 bg-cream-100 dark:bg-[#1E2520] border border-sage rounded px-1.5 py-0.5 text-xs text-forest dark:text-[#F1F3EE] focus:outline-none"
                          />
                          <button
                            onClick={e => commitRename(e, conv.id)}
                            className="p-0.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-900"
                            title="Save title"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : isConfirmingDelete ? (
                        <div className="flex items-center justify-between gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold truncate">Delete chat?</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                                setDeletingId(null);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-red-600 text-white hover:bg-red-700 font-medium"
                              title="Confirm delete"
                            >
                              Yes
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setDeletingId(null);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-cream-300 dark:bg-[#3B473E] text-forest dark:text-[#F1F3EE]"
                              title="Cancel"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 truncate">{conv.title}</span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            <button
                              onClick={e => startRename(e, conv)}
                              className="p-0.5 text-warm-grey dark:text-[#8E9B90] hover:text-forest dark:hover:text-[#F1F3EE]"
                              title="Rename conversation"
                            >
                              <Pencil size={11} />
                            </button>
                            {conversations.length > 1 && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setDeletingId(conv.id);
                                }}
                                className="p-0.5 text-warm-grey dark:text-[#8E9B90] hover:text-red-600 dark:hover:text-red-400"
                                title="Delete conversation"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Learning Tools */}
        <div>
          {!collapsed && (
            <p className="px-2 mb-1 text-[10px] font-bold text-warm-grey dark:text-[#8E9B90] uppercase tracking-wider">
              Learning Tools
            </p>
          )}
          <div className="space-y-0.5">
            {LEARNING_TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleNav(id)}
                title={collapsed ? label : undefined}
                className={`nav-link w-full text-xs !py-2 ${
                  currentPage === id ? 'nav-link-active' : ''
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Science Chapters */}
        <div>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title="Science Chapters"
              className="w-full flex justify-center py-2 rounded-lg text-warm-grey dark:text-[#A7B2A9] hover:bg-cream-200 dark:hover:bg-[#252F29] hover:text-forest dark:hover:text-[#F1F3EE]"
            >
              <BookOpen size={15} />
            </button>
          ) : (
            <>
              <button
                onClick={() => setChaptersOpen(o => !o)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-warm-grey dark:text-[#8E9B90] uppercase tracking-wider hover:text-forest dark:hover:text-[#F1F3EE]"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen size={11} />
                  Science Chapters ({availableChapters.length})
                </span>
                {chaptersOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {chaptersOpen && (
                <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin pr-0.5">
                  <button
                    onClick={() => handleSelectChapter(null)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                      selectedChapter === null
                        ? 'bg-sage/20 dark:bg-[#9BB99A]/20 text-forest dark:text-[#F1F3EE] font-bold'
                        : 'text-warm-grey dark:text-[#A7B2A9] hover:bg-cream-200 dark:hover:bg-[#252F29] hover:text-forest dark:hover:text-[#F1F3EE] font-medium'
                    }`}
                  >
                    All Chapters (Complete Textbook)
                  </button>
                  {availableChapters.map(ch => (
                    <button
                      key={ch.chapter_number}
                      onClick={() => handleSelectChapter(ch.chapter_number)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between gap-1.5 transition-colors ${
                        selectedChapter === ch.chapter_number
                          ? 'bg-sage/20 dark:bg-[#9BB99A]/20 text-forest dark:text-[#F1F3EE] font-bold'
                          : 'text-warm-grey dark:text-[#A7B2A9] hover:bg-cream-200 dark:hover:bg-[#252F29] hover:text-forest dark:hover:text-[#F1F3EE] font-medium'
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-bold">Ch.{ch.chapter_number}</span> · {ch.chapter_title}
                      </span>
                      <span className="text-[9px] font-mono text-warm-beige dark:text-[#6C7B70] flex-shrink-0">
                        {ch.chunk_count > 0 ? ch.chunk_count : 'PDF'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Upload PDF */}
        <div>
          <button
            onClick={handleOpenUpload}
            title="Upload PDF"
            className={`nav-link w-full text-xs !py-2 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <Upload size={15} className="flex-shrink-0 text-sage-dark dark:text-[#9BB99A]" />
            {!collapsed && <span>Upload PDF</span>}
          </button>
        </div>
      </div>

      {/* Bottom section: Pipeline Explorer & Settings */}
      <div className="border-t border-cream-400 dark:border-[#3B473E] p-2 space-y-0.5">
        <button
          onClick={() => handleNav('pipeline')}
          title="Pipeline Explorer"
          className={`nav-link w-full text-xs !py-2 ${
            currentPage === 'pipeline' || ['overview','upload','extraction','chunks','embeddings','vectors','retrieval','chatbot','logs'].includes(currentPage)
              ? 'nav-link-active'
              : ''
          } ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <Wrench size={15} className="flex-shrink-0" />
          {!collapsed && <span>Pipeline Explorer</span>}
        </button>

        <button
          onClick={() => handleNav('settings')}
          title="Settings"
          className={`nav-link w-full text-xs !py-2 ${
            currentPage === 'settings' ? 'nav-link-active' : ''
          } ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <Settings size={15} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        {!collapsed && (
          <div
            onClick={() => handleNav('settings')}
            className="flex items-center justify-between px-3 pt-1.5 pb-0.5 text-[10px] text-warm-grey dark:text-[#8E9B90] cursor-pointer hover:text-forest dark:hover:text-[#F1F3EE]"
          >
            <span className="flex items-center gap-1.5">
              <Circle
                size={7}
                className={online ? 'text-emerald-500 fill-emerald-500' : 'text-red-400 fill-red-400'}
              />
              {online ? 'Backend Online' : 'Backend Offline'}
            </span>
            {online && (
              <span className="font-mono text-warm-beige dark:text-[#6C7B70]">
                {status?.total_chunks?.toLocaleString() || 0} chunks
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block h-screen sticky top-0 flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
            onClick={closeMobile}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
