import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { createMockClient } from '../../lib/api/mock';
import { formatTime } from '../../lib/formatters';
import type { SystemEvent, Page } from '../../lib/api/types';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  RefreshCw,
  CheckCircle2,
  Filter
} from 'lucide-react';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const mockClient = IS_MOCK ? createMockClient() : null;

type SeverityFilter = 'all' | 'warning' | 'error';

export function SystemEventsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res: Page<SystemEvent>;
      if (IS_MOCK && mockClient) {
        res = await mockClient.getEvents({ limit: '50' });
      } else {
        res = await apiFetch<Page<SystemEvent>>(`${ENDPOINTS.EVENTS}?limit=50`, {
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

  const filteredEvents = events.filter((e) => {
    if (filter === 'warning') return e.severity === 'warning';
    if (filter === 'error') return e.severity === 'error';
    return true;
  });

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-sm">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[var(--surface-2)] transition select-none"
        aria-expanded={isOpen}
        aria-label="System Events Log"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--brand-primary)]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)] text-sm">
                System Events Log
              </span>
              <span className="text-[10px] bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-mono">
                {events.length}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Real-time hardware status changes, warnings, and errors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {/* Collapsible Timeline Content */}
      {isOpen && (
        <div className="p-4 pt-0 border-t border-[var(--border-subtle)] space-y-3.5">
          {/* Controls: Filter chips & Refresh button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] mr-1" />
              {(['all', 'warning', 'error'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg capitalize font-medium transition ${
                    filter === sev
                      ? 'bg-[var(--brand-primary)] text-[var(--text-on-brand)]'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {sev === 'all' ? 'All events' : `${sev}s`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="text-[11px]">Auto-updates</span>
              <button
                onClick={() => void fetchEvents()}
                disabled={loading}
                className="flex items-center gap-1 text-[var(--text-primary)] hover:underline disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div role="alert" className="p-3 bg-red-500/10 border border-[var(--danger-border)] text-[var(--danger-text)] text-xs rounded-xl flex items-center justify-between">
              <span>Failed to fetch events: {error}</span>
              <button
                onClick={() => void fetchEvents()}
                className="px-2 py-0.5 rounded bg-[var(--surface-1)] text-xs border border-[var(--border-subtle)]"
              >
                Retry
              </button>
            </div>
          )}

          {/* Vertical Timeline */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredEvents.length === 0 ? (
              <div className="py-8 text-center bg-[var(--surface-2)] rounded-xl border border-[var(--border-subtle)]">
                <CheckCircle2 className="w-6 h-6 text-[var(--success-solid)] mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  No events yet — that's good
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Subsystems report events here when warnings or status transitions occur.
                </p>
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const isError = evt.severity === 'error';
                const isWarning = evt.severity === 'warning';

                return (
                  <div
                    key={evt.id}
                    className="flex items-start gap-2.5 text-xs p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] transition"
                  >
                    {/* Severity dot / icon */}
                    <div className="mt-0.5 shrink-0">
                      {isError ? (
                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-[var(--danger-text)]">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      ) : isWarning ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <Info className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Component Chip & Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-muted)]">
                          {evt.component}
                        </span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {formatTime(evt.occurred_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                        {evt.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
