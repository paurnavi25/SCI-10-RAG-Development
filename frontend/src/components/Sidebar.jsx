import {
  LayoutDashboard, Upload, FileText, Layers, Cpu, Database,
  Search, MessageCircle, ScrollText, ChevronLeft, ChevronRight,
  Atom, Circle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV = [
  { id: 'overview',   label: 'Overview',          icon: LayoutDashboard },
  { id: 'upload',     label: 'Document Upload',    icon: Upload },
  { id: 'extraction', label: 'Text Extraction',    icon: FileText },
  { id: 'chunks',     label: 'Chunk Explorer',     icon: Layers },
  { id: 'embeddings', label: 'Embeddings',         icon: Cpu },
  { id: 'vectors',    label: 'Vector Store',       icon: Database },
  { id: 'retrieval',  label: 'Retrieval Inspector',icon: Search },
  { id: 'chatbot',    label: 'AI Chatbot',         icon: MessageCircle },
  { id: 'logs',       label: 'Pipeline Logs',      icon: ScrollText },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const { currentPage, setCurrentPage, status } = useApp();
  const online = status?.status === 'online';

  return (
    <aside
      className={`flex flex-col bg-cream-100 border-r border-cream-400 h-screen sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-cream-400">
        <div className="w-8 h-8 bg-forest rounded-lg flex items-center justify-center flex-shrink-0">
          <Atom size={16} className="text-cream-100" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-forest leading-tight tracking-wide">SCIENCE / RAG</p>
            <p className="text-[10px] text-warm-grey leading-tight">NCERT Class 10 · AI Lab</p>
          </div>
        )}
      </div>

      {/* Status dot */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-cream-400">
          <div className="flex items-center gap-2 text-xs">
            <Circle
              size={8}
              className={online ? 'text-emerald-500 fill-emerald-500' : 'text-red-400 fill-red-400'}
            />
            <span className={online ? 'text-emerald-700' : 'text-red-600'}>
              {online ? 'Backend Online' : 'Backend Offline'}
            </span>
          </div>
          {online && (
            <p className="text-[10px] text-warm-grey mt-0.5">
              {status?.total_chunks?.toLocaleString() || 0} chunks indexed
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentPage(id)}
            title={collapsed ? label : undefined}
            className={`nav-link w-full text-left ${currentPage === id ? 'nav-link-active' : ''} ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 border-t border-cream-400 text-warm-grey hover:text-forest hover:bg-cream-300 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}

