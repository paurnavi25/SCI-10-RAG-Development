import { useState } from 'react';
import { Trash2, Download, CheckCircle2, XCircle, Info, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';

function formatTs(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return iso;
  }
}

function StatusIcon({ status }) {
  if (status === 'success') return <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />;
  if (status === 'error')   return <XCircle size={13} className="text-red-500 flex-shrink-0" />;
  return <Info size={13} className="text-sage flex-shrink-0" />;
}

function StatusBadge({ status }) {
  const cls = {
    success: 'badge-green',
    error:   'badge-red',
    info:    'badge-blue',
  }[status] ?? 'badge-blue';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function PipelineLogs() {
  const { logs, clearLogs } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = logs
    .filter(l => filter === 'all' || l.status === filter)
    .filter(l => !search || l.operation.toLowerCase().includes(search.toLowerCase()) || l.detail?.toLowerCase().includes(search.toLowerCase()));

  const exportLogs = () => {
    const text = filtered
      .map(l => `[${l.timestamp}] [${l.status.toUpperCase()}] ${l.operation}${l.detail ? ` — ${l.detail}` : ''}${l.duration ? ` (${Number(l.duration).toFixed(2)}s)` : ''}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rag-pipeline-logs-${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-forest">Pipeline Logs</h2>
          <p className="text-sm text-warm-grey mt-0.5">
            Real-time activity from all pipeline operations in this session · {logs.length} events recorded
          </p>
        </div>
        {logs.length > 0 && (
          <button onClick={clearLogs} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs">
            <Trash2 size={12} /> Clear Logs
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search operations..."
          className="input-field flex-1 min-w-48 py-1.5"
        />
        <div className="flex items-center gap-1">
          {['all', 'success', 'error', 'info'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-forest text-cream-100'
                  : 'bg-cream-200 text-warm-grey hover:bg-cream-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button onClick={exportLogs} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs" disabled={filtered.length === 0}>
          <Download size={12} /> Export
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Events', value: logs.length, color: 'text-forest' },
          { label: 'Successful', value: logs.filter(l => l.status === 'success').length, color: 'text-emerald-700' },
          { label: 'Errors', value: logs.filter(l => l.status === 'error').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-warm-grey mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock size={36} className="text-cream-500 mx-auto mb-3" />
            <p className="text-warm-grey font-medium">No log entries yet</p>
            <p className="text-xs text-warm-grey mt-1">Pipeline events will appear here as you use the application.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-400 bg-cream-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-warm-grey uppercase tracking-wide">Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-warm-grey uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-warm-grey uppercase tracking-wide">Operation</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-warm-grey uppercase tracking-wide">Detail</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-warm-grey uppercase tracking-wide">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-cream-200 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-warm-grey whitespace-nowrap">
                      {formatTs(log.timestamp)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={log.status} />
                        <StatusBadge status={log.status} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-forest font-medium max-w-xs">
                      <span className="line-clamp-1">{log.operation}</span>
                    </td>
                    <td className="px-4 py-2.5 text-warm-grey text-xs max-w-sm">
                      <span className="line-clamp-1">{log.detail || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-warm-grey whitespace-nowrap">
                      {log.duration != null ? `${Number(log.duration).toFixed(2)}s` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <p className="text-xs text-warm-grey text-center">
          Showing {filtered.length} of {logs.length} entries · Newest first · Max 200 entries stored
        </p>
      )}
    </div>
  );
}
