import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, X, AlertTriangle, Sparkles } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

const STEPS = [
  'Reading PDF',
  'Extracting text',
  'Creating chunks',
  'Generating embeddings',
  'Saving to vector database',
];

export default function UploadModal() {
  const {
    uploadModalOpen,
    setUploadModalOpen,
    pendingUploadFile,
    setPendingUploadFile,
    refreshStatus,
    addLog,
    setSelectedChapter,
    setCurrentPage,
  } = useApp();

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Automatically load file if triggered via attachment menu
  useState(() => {
    if (pendingUploadFile) {
      if (pendingUploadFile.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(pendingUploadFile);
      }
      setPendingUploadFile(null);
    }
  });

  if (!uploadModalOpen) return null;

  const resetModal = () => {
    if (uploading) return;
    setSelectedFile(null);
    setActiveStep(-1);
    setResult(null);
    setError('');
    setUploadModalOpen(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file (.pdf).');
      return;
    }
    setError('');
    setResult(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setError('');
    setResult(null);
    setActiveStep(0);

    // Advance visual steps smoothly while backend processes the PDF
    const timers = [
      setTimeout(() => setActiveStep(1), 450),
      setTimeout(() => setActiveStep(2), 1100),
      setTimeout(() => setActiveStep(3), 1800),
      setTimeout(() => setActiveStep(4), 2600),
    ];

    const t0 = Date.now();
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.uploadPDF(formData);
      timers.forEach(clearTimeout);
      setActiveStep(5);
      setResult(res);
      await refreshStatus();
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      addLog(
        `Uploaded PDF: ${res.source_name || selectedFile.name}`,
        'success',
        `${res.total_pages} pages · ${res.total_chunks_extracted} chunks`,
        elapsed
      );
    } catch (e) {
      timers.forEach(clearTimeout);
      setActiveStep(-1);
      setError(e.message || 'Failed to process PDF.');
      addLog(`Upload failed: ${selectedFile.name}`, 'error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAskAboutChapter = () => {
    if (result?.chapter_number != null) {
      setSelectedChapter(result.chapter_number);
    }
    setCurrentPage('chat');
    resetModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4">
      <div className="bg-cream-100 border border-cream-400 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-400">
          <div>
            <h2 className="text-base font-semibold text-forest">Upload Textbook Chapter (PDF)</h2>
            <p className="text-xs text-warm-grey">Add a Class 10 Science PDF to your AI Tutor knowledge base</p>
          </div>
          <button
            onClick={resetModal}
            disabled={uploading}
            className="p-1.5 rounded-lg text-warm-grey hover:text-forest hover:bg-cream-300 disabled:opacity-40"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-sage bg-sage/10'
                  : 'border-cream-400 bg-cream-200/50 hover:bg-cream-200'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Upload size={26} className="mx-auto text-sage-dark mb-2" />
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-forest flex items-center justify-center gap-1.5">
                    <FileText size={14} className="text-sage-dark" />
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-warm-grey">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to choose a different file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-forest">
                    Drag & drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-warm-grey">Supports NCERT Class 10 Science chapter PDFs</p>
                </div>
              )}
            </div>
          )}

          {/* 5-step progress indicator */}
          {(uploading || activeStep >= 0) && !result && (
            <div className="bg-cream-200/70 border border-cream-400 rounded-xl p-4 space-y-2.5">
              {STEPS.map((label, idx) => {
                const done = activeStep > idx;
                const current = activeStep === idx;
                return (
                  <div key={label} className="flex items-center gap-2.5 text-xs">
                    {done ? (
                      <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                    ) : current ? (
                      <Loader2 size={15} className="text-sage-dark animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-cream-500 flex-shrink-0" />
                    )}
                    <span className={done || current ? 'text-forest font-medium' : 'text-warm-grey'}>
                      {idx + 1}. {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="text-sm font-semibold text-forest">
                    Chapter Ready for Learning!
                  </p>
                  <p className="text-warm-grey">
                    Processed <span className="font-medium text-forest">{result.source_name}</span>
                    {result.chapter_title ? ` (${result.chapter_title})` : ''}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-cream-100 border border-cream-400 rounded-lg p-2">
                  <p className="text-base font-semibold text-forest">{result.total_pages}</p>
                  <p className="text-[10px] text-warm-grey">Pages</p>
                </div>
                <div className="bg-cream-100 border border-cream-400 rounded-lg p-2">
                  <p className="text-base font-semibold text-forest">{result.total_chunks_extracted}</p>
                  <p className="text-[10px] text-warm-grey">Chunks Created</p>
                </div>
                <div className="bg-cream-100 border border-cream-400 rounded-lg p-2">
                  <p className="text-base font-semibold text-forest">{result.total_master_chunks}</p>
                  <p className="text-[10px] text-warm-grey">Total Indexed</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-cream-400 bg-cream-200/50 flex items-center justify-end gap-2">
          {result ? (
            <>
              <button onClick={resetModal} className="btn-secondary text-xs">
                Close
              </button>
              <button onClick={handleAskAboutChapter} className="btn-primary text-xs inline-flex items-center gap-1.5">
                <Sparkles size={13} />
                Ask Questions Now
              </button>
            </>
          ) : (
            <>
              <button onClick={resetModal} disabled={uploading} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="btn-primary text-xs inline-flex items-center gap-1.5"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? 'Processing...' : 'Upload & Index'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

