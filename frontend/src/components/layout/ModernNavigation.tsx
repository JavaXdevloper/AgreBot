import { Compass, Clock, Sliders } from 'lucide-react';
import type { ComponentType } from 'react';
import { STRINGS } from '../../lib/strings';

export type MainNavPage = 'drive' | 'history' | 'system';

interface ModernNavigationProps {
  currentPage: MainNavPage;
  onPageChange: (page: MainNavPage) => void;
}

export function ModernLeftRail({ currentPage, onPageChange }: ModernNavigationProps) {
  const items: { id: MainNavPage; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: 'drive', label: STRINGS.nav.drive, icon: Compass },
    { id: 'history', label: STRINGS.nav.history, icon: Clock },
    { id: 'system', label: STRINGS.nav.system, icon: Sliders },
  ];

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-48 bg-surface-1 border-r border-border shrink-0 select-none py-4 px-2 space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-input text-xs font-semibold transition-all ${
              isActive
                ? 'bg-brand/10 text-brand border border-brand/20 font-bold'
                : 'text-text-muted hover:text-text hover:bg-surface-2 border border-transparent'
            }`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand' : 'text-text-muted'}`} />
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

export function ModernBottomTabs({ currentPage, onPageChange }: ModernNavigationProps) {
  const items: { id: MainNavPage; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: 'drive', label: STRINGS.nav.drive, icon: Compass },
    { id: 'history', label: STRINGS.nav.history, icon: Clock },
    { id: 'system', label: STRINGS.nav.system, icon: Sliders },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-1/95 backdrop-blur-sm border-t border-border flex items-center justify-around h-14 pb-safe select-none"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-[11px] font-semibold transition-colors ${
              isActive ? 'text-brand font-bold' : 'text-text-muted hover:text-text'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-brand' : 'text-text-muted'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
