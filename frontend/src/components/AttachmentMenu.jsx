import { useState, useRef, useEffect } from 'react';
import { Plus, FileText, Image as ImageIcon, Camera, X } from 'lucide-react';

export default function AttachmentMenu({
  onSelectPDF,
  onSelectImage,
  onOpenTakeCamera,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePDFChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectPDF(file);
      e.target.value = '';
    }
    setIsOpen(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelectImage(file);
      e.target.value = '';
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      {/* Hidden file inputs */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handlePDFChange}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleImageChange}
        className="hidden"
      />

      {/* Circular Plus Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-8 h-8 rounded-full border border-cream-400 dark:border-[#3B473E] bg-cream-200 dark:bg-[#303B33] text-forest dark:text-[#F1F3EE] flex items-center justify-center hover:bg-cream-300 dark:hover:bg-[#3B473E] transition-all shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
          isOpen ? 'rotate-45 bg-cream-300 dark:bg-[#3B473E]' : ''
        }`}
        title="Add attachment (PDF, Photo, or Camera)"
        aria-label="Add attachment"
        aria-expanded={isOpen}
      >
        <Plus size={16} className="transition-transform duration-200" />
      </button>

      {/* ChatGPT-style Popup Menu */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-64 bg-cream-100 dark:bg-[#252F29] border border-cream-400 dark:border-[#3B473E] rounded-2xl shadow-xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
          {/* Option 1: Upload Textbook PDF */}
          <button
            type="button"
            onClick={() => {
              pdfInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream-200 dark:hover:bg-[#303B33] text-left transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-800 dark:text-emerald-300 group-hover:scale-105 transition-transform flex-shrink-0">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-forest dark:text-[#F1F3EE] font-heading leading-tight truncate">
                Upload Textbook PDF
              </p>
              <p className="text-[10px] text-warm-grey dark:text-[#8E9B90] leading-snug truncate">
                Index NCERT chapter into RAG
              </p>
            </div>
          </button>

          {/* Option 2: Upload Photo */}
          <button
            type="button"
            onClick={() => {
              imageInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream-200 dark:hover:bg-[#303B33] text-left transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center text-blue-800 dark:text-blue-300 group-hover:scale-105 transition-transform flex-shrink-0">
              <ImageIcon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-forest dark:text-[#F1F3EE] font-heading leading-tight truncate">
                Upload Photo
              </p>
              <p className="text-[10px] text-warm-grey dark:text-[#8E9B90] leading-snug truncate">
                Diagrams, figures & questions
              </p>
            </div>
          </button>

          {/* Option 3: Take a Photo */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenTakeCamera();
            }}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream-200 dark:hover:bg-[#303B33] text-left transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-800 dark:text-amber-300 group-hover:scale-105 transition-transform flex-shrink-0">
              <Camera size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-forest dark:text-[#F1F3EE] font-heading leading-tight truncate">
                Take a Photo
              </p>
              <p className="text-[10px] text-warm-grey dark:text-[#8E9B90] leading-snug truncate">
                Use camera to snap figure
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
