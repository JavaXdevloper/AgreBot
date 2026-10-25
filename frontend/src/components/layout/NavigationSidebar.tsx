import React from 'react';
import { LayoutDashboard, Radio, Database, Film, Bell, Bot } from 'lucide-react';
import { formatTime } from '../../lib/formatters';
import type { ModeBadge } from '../layout/AppHeader';

export type NavTab = 'dashboard' | 'controls' | 'history' | 'replay' | 'events';

interface NavigationSidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  modeBadge: ModeBadge;
  lastUpdated: string | null;
  roverControl: string;
}

export function NavigationSidebar({
  currentTab,
  onTabChange,
  modeBadge,
  lastUpdated,
  roverControl,
}: NavigationSidebarProps) {
  const isUnlocked = roverControl === 'ready';

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Live Cockpit', icon: LayoutDashboard },
    { id: 'controls', label: 'Rover Drive Pad', icon: Radio },
    { id: 'history', label: 'Detection Logs', icon: Database },
    { id: 'replay', label: 'Diagnostics & Replay', icon: Film },
    { id: 'events', label: 'System Events', icon: Bell },
  ];

  return (
    <aside className="w-full md:w-64 bg-[#090d16] border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0">
      {/* Brand & Subtitle */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-lg shadow-emerald-950/40 shrink-0">
            <div className="w-full h-full bg-[#0d131f] rounded-[11px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            </div>
          </div>
          <div>
            <span className="text-sm font-black tracking-wider text-slate-100 uppercase font-mono block">
              Agri Rover
            </span>
            <p className="text-[10px] text-emerald-400/80 font-mono tracking-widest uppercase">
              Inspection OS
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0" aria-label="Sidebar Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap md:whitespace-normal w-full text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-300 border border-emerald-500/30 shadow-md glow-emerald'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Operator Telemetry */}
      <div className="hidden md:flex flex-col gap-3 pt-4 border-t border-slate-800/80 text-xs font-mono">
        <div className="bg-[#0d131f] p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Security</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isUnlocked
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isUnlocked ? 'AUTHORIZED' : 'LOCKED'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Mode</span>
            <span className="text-slate-300 font-bold">{modeBadge}</span>
          </div>

          {lastUpdated && (
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 truncate">
              Sync: <span className="text-slate-400">{formatTime(lastUpdated)}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
