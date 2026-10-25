import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight, Filter, Database } from 'lucide-react';
import { useDetectionHistory } from '../../hooks/useDetectionHistory';
import { formatDateTime, formatConfidence } from '../../lib/formatters';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import type { Mode } from '../../lib/api/types';

export function DetectionHistoryTable() {
  const { filters, setFilters, data, labels, loading, error, refresh } = useDetectionHistory();

  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }));
  };

  const handleLimitChange = (newLimit: number) => {
    setFilters((prev) => ({ ...prev, limit: newLimit, offset: 0 }));
  };

  const handleLabelChange = (selectedLabel: string) => {
    setFilters((prev) => ({ ...prev, label: selectedLabel, offset: 0 }));
  };

  const handleModeChange = (selectedMode: string) => {
    setFilters((prev) => ({ ...prev, mode: selectedMode as Mode | '', offset: 0 }));
  };

  const totalPages = Math.ceil(data.total / filters.limit) || 1;
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-100">
              Detection History
            </h2>
            <p className="text-[11px] text-slate-400">
              Verified SQLite persistence database records
            </p>
          </div>
        </div>

        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="min-h-[36px] px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition disabled:opacity-40 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
        <div>
          <label htmlFor="filter-label" className="block text-slate-400 mb-1 font-mono text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500" />
            Class Label
          </label>
          <select
            id="filter-label"
            value={filters.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          >
            <option value="">All Labels</option>
            {labels.map((lbl) => (
              <option key={lbl} value={lbl}>
                {lbl}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-mode" className="block text-slate-400 mb-1 font-mono text-[11px]">
            Capture Mode
          </label>
          <select
            id="filter-mode"
            value={filters.mode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          >
            <option value="">All Modes</option>
            <option value="live">Live Only</option>
            <option value="replay">Replay Only</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-limit" className="block text-slate-400 mb-1 font-mono text-[11px]">
            Page Size
          </label>
          <select
            id="filter-limit"
            value={filters.limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="w-full bg-[#0d131f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          >
            <option value={25}>25 items</option>
            <option value={50}>50 items</option>
            <option value={100}>100 items</option>
          </select>
        </div>

        <div className="flex items-end text-slate-400 text-xs py-1 font-mono">
          <span>Records: <strong className="text-emerald-400">{data.total}</strong></span>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div role="alert" className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Database query error: {error.message}</span>
          </div>
          <button
            onClick={() => void refresh()}
            className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 text-rose-200 rounded font-medium border border-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Modern Dark Table Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#0d131f]">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px] tracking-wider font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">Timestamp (Local)</th>
              <th scope="col" className="px-4 py-3">Label</th>
              <th scope="col" className="px-4 py-3">Confidence</th>
              <th scope="col" className="px-4 py-3">Mode</th>
              <th scope="col" className="px-4 py-3">Session Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {loading && data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <LoadingState message="Querying SQLite telemetry..." />
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <EmptyState message="No detections recorded for these filters." />
                </td>
              </tr>
            ) : (
              data.items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-2.5 text-slate-300">
                    {formatDateTime(row.detected_at)}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-white capitalize font-sans">
                    {row.label}
                  </td>
                  <td className="px-4 py-2.5 text-emerald-400 font-bold">
                    {formatConfidence(row.confidence)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        row.source_mode === 'replay'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {row.source_mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-[11px] truncate max-w-[140px]">
                    {row.session_id ? row.session_id.substring(0, 8) + '...' : 'none'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data.total > filters.limit && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
          <div>
            Showing {filters.offset + 1}–{Math.min(filters.offset + filters.limit, data.total)} of {data.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
              disabled={filters.offset === 0 || loading}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(filters.offset + filters.limit)}
              disabled={filters.offset + filters.limit >= data.total || loading}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
