import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, FolderOpen, Zap } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context/AppContext';

function DropZone({ onFiles }) {
  const [drag, setDrag] = useState(false);

  const handleDrop = e => {
    e.preventDefault(); setDrag(false);
    const files = [...e.dataTransfer.files].filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length) onFiles(files);
    else alert('Please drop PDF files only.');
  };

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl2 p-10 cursor-pointer transition-all
        ${drag ? 'border-sage bg-sage/10' : 'border-cream-400 hover:border-sage/60 hover:bg-sage/5'}`}
    >
      <Upload size={32} className={drag ? 'text-sage' : 'text-warm-beige'} />
      <p className="mt-3 text-sm font-medium text-forest">Drag & drop PDF files here</p>
      <p className="text-xs text-warm-grey mt-1">or click to browse – multiple files supported</p>
      <input type="file" accept=".pdf" multiple className="hidden"
        onChange={e => onFiles([...e.target.files])} />
    </label>
  );
}

function FileRow({ file, status, error }) {
  const icon = status === 'done'    ? <CheckCircle2 size={14} className="text-emerald-500" />
             : status === 'error'   ? <AlertCircle  size={14} className="text-red-500" />
             : status === 'loading' ? <Loader2      size={14} className="text-sage animate-spin" />
             : <FileText size={14} className="text-warm-beige" />;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-cream-300 text-sm">
      {icon}
      <span className="flex-1 truncate font-medium text-forest">{file.name}</span>
      <span className="text-warm-grey text-xs flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}

export default function DocumentUpload() {
  const { addLog, refreshStatus, status } = useApp();
  const [files, setFiles]           = useState([]);
  const [fileStatus, setFileStatus] = useState({});
  const [processing, setProcessing] = useState(false);
  const [batchLoading, setBatch]    = useState(false);
  const [result, setResult]         = useState(null);

  const addFiles = useCallback(incoming => {
    const unique = incoming.filter(f => !files.find(x => x.name === f.name));
    setFiles(prev => [...prev, ...unique]);
  }, [files]);

  const setFS = (name, s) => setFileStatus(prev => ({ ...prev, [name]: s }));

  const processFiles = async () => {
    if (!files.length || processing) return;
    setProcessing(true);
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    files.forEach(f => setFS(f.name, 'loading'));
    const t0 = Date.now();
    try {
      const data = await api.uploadBatch(fd);
      files.forEach(f => setFS(f.name, 'done'));
      setResult(data);
      addLog('Batch PDF ingestion', 'success',
        `${data.processed_count} chapters, ${data.total_master_chunks} total chunks`,
        ((Date.now() - t0) / 1000).toFixed(1));
      await refreshStatus();
    } catch (e) {
      files.forEach(f => setFS(f.name, 'error'));
      addLog('Batch PDF ingestion', 'error', e.message);
      alert('Error: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const ingestAll = async () => {
    if (!confirm('Ingest all 13 local chapter PDFs into the vector store?')) return;
    setBatch(true);
    const t0 = Date.now();
    try {
      const data = await api.batchLocal({ ingest_all: true });
      setResult(data);
      addLog('Batch local ingest (all 13 chapters)', 'success',
        `${data.total_master_chunks} chunks`, ((Date.now() - t0) / 1000).toFixed(1));
      await refreshStatus();
    } catch (e) {
      addLog('Batch local ingest', 'error', e.message);
      alert('Error: ' + e.message);
    } finally { setBatch(false); }
  };

  const localPDFs = status?.available_local_pdfs || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* Quick ingest all */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-forest text-sm">Ingest All 13 NCERT Chapters</p>
          <p className="text-xs text-warm-grey mt-0.5">
            Detected {localPDFs.length} local PDF files · processes all into the RAG knowledge base
          </p>
        </div>
        <button onClick={ingestAll} disabled={batchLoading} className="btn-primary flex items-center gap-2 flex-shrink-0">
          {batchLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {batchLoading ? 'Ingesting…' : 'Ingest All'}
        </button>
      </div>

      {/* Drop zone */}
      <div className="card p-5 space-y-4">
        <p className="section-title">Upload Custom PDFs</p>
        <DropZone onFiles={addFiles} />

        {files.length > 0 && (
          <div>
            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {files.map(f => (
                <FileRow key={f.name} file={f} status={fileStatus[f.name] || 'pending'} />
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={processFiles} disabled={processing} className="btn-primary flex items-center gap-2">
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {processing ? 'Processing...' : `Process ${files.length} File${files.length > 1 ? 's' : ''}`}
              </button>
              <button onClick={() => { setFiles([]); setFileStatus({}); setResult(null); }}
                disabled={processing} className="btn-secondary">Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* Local chapter selector */}
      <div className="card p-5 space-y-3">
        <p className="section-title flex items-center gap-2"><FolderOpen size={14} /> Local Chapter Files</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {localPDFs.map(f => (
            <div key={f.filename}
              className="bg-cream-200 border border-cream-400 rounded-lg px-3 py-2 text-xs space-y-0.5">
              <p className="font-semibold text-forest truncate">{f.chapter_title}</p>
              <p className="text-warm-grey font-mono">{f.filename}</p>
              <p className="text-warm-beige">{f.size_mb} MB</p>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <p className="font-medium text-forest text-sm">Ingestion Complete</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-cream-200 rounded-lg p-2">
              <p className="text-warm-grey">Chapters</p>
              <p className="text-lg font-semibold text-forest">{result.processed_count || result.chapters?.length}</p>
            </div>
            <div className="bg-cream-200 rounded-lg p-2">
              <p className="text-warm-grey">Total Chunks</p>
              <p className="text-lg font-semibold text-forest">{result.total_master_chunks?.toLocaleString()}</p>
            </div>
          </div>
          {result.chapters && (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-cream-400">
                <th className="text-left py-1 text-warm-grey font-medium">Ch #</th>
                <th className="text-left py-1 text-warm-grey font-medium">Title</th>
                <th className="text-left py-1 text-warm-grey font-medium">Pages</th>
                <th className="text-left py-1 text-warm-grey font-medium">Chunks</th>
              </tr></thead>
              <tbody>
                {result.chapters.map(c => (
                  <tr key={c.chapter_number} className="border-b border-cream-300">
                    <td className="py-1.5 font-mono font-semibold text-sage-dark">{c.chapter_number}</td>
                    <td className="py-1.5 text-forest">{c.chapter_title}</td>
                    <td className="py-1.5 text-warm-grey">{c.pages}</td>
                    <td className="py-1.5 font-semibold text-forest">{c.chunks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

