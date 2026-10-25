import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { createMockClient } from '../../lib/api/mock';
import { formatTime } from '../../lib/formatters';
import type { SystemEvent, Page } from '../../lib/api/types';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Bell, RefreshCw } from 'lucide-react';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

export function SystemEventsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res: Page<SystemEvent>;
      if (IS_MOCK && mockClient) {
        res = await mockClient.getEvents({ limit: '20' });
      } else {
        res = await apiFetch<Page<SystemEvent>>(`${ENDPOINTS.EVENTS}?limit=20`, {
          timeoutMs: 4000,
        });
      }
      if (!mountedRef.current) return;
      setEvents(res.items);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch system events');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    mountedRef.current = true;
    if (!isOpen) return;

    const run = async () => {
      if (!ignore) {
        await fetchEvents();
      }
    };
    void run();

    const interval = setInterval(() => {
      if (!ignore) {
        void fetchEvents();
      }
    }, 10000);

    return () => {
      ignore = true;
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [isOpen, fetchEvents]);

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 text-xs font-mono uppercase tracking-wider">
            System Events Log
          </span>
          <span className="text-[10px] bg-slate-800 border border-slate-700 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
            {events.length}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 pt-0 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-[11px] font-mono text-slate-400">Auto-polls every 10s</span>
            <button
              onClick={() => void fetchEvents()}
              disabled={loading}
              className="text-[11px] font-mono flex items-center gap-1.5 text-slate-400 hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </button>
          </div>

          {error && (
            <div role="alert" className="p-2.5 bg-rose-950/40 text-rose-300 text-xs rounded-xl border border-rose-500/30">
              {error}
            </div>
          )}

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center font-mono">No recent system events</p>
            ) : (
              events.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-2.5 text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800"
                >
                  {evt.severity === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  ) : evt.severity === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-slate-400 font-mono uppercase tracking-wider text-[10px] mr-1.5">
                      [{evt.component}]
                    </span>
                    <span className="text-slate-200">{evt.message}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                    {formatTime(evt.occurred_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
