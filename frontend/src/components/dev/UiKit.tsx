import { useState, useEffect } from 'react';
import { Sun, Moon, Shield, Radio, Check, AlertTriangle, AlertCircle, Play, Square } from 'lucide-react';

export function UiKit() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [pin, setPin] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="min-h-screen bg-bg text-text p-6 max-w-5xl mx-auto space-y-10">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agri Rover — Design System & Tokens (UI-0)</h1>
          <p className="text-text-muted text-sm mt-1">Theme testing & design token verification suite</p>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-4 py-2 rounded-input bg-surface-2 hover:bg-surface-1 border border-border text-sm font-medium transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-warn" /> : <Moon className="w-4 h-4 text-info" />}
          <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
        </button>
      </div>

      {/* Colour Tokens Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-wide">1. Token Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {[
            { name: 'bg', color: 'bg-bg', text: 'text-text', border: 'border-border' },
            { name: 'surface-1', color: 'bg-surface-1', text: 'text-text', border: 'border-border' },
            { name: 'surface-2', color: 'bg-surface-2', text: 'text-text', border: 'border-border' },
            { name: 'brand', color: 'bg-brand', text: 'text-brand-foreground', border: 'border-transparent' },
            { name: 'ok', color: 'bg-ok', text: 'text-black', border: 'border-transparent' },
            { name: 'warn', color: 'bg-warn', text: 'text-black', border: 'border-transparent' },
            { name: 'danger', color: 'bg-danger', text: 'text-white', border: 'border-transparent' },
            { name: 'danger-solid', color: 'bg-danger-solid', text: 'text-white', border: 'border-transparent' },
            { name: 'info', color: 'bg-info', text: 'text-white', border: 'border-transparent' },
            { name: 'replay', color: 'bg-replay', text: 'text-white', border: 'border-transparent' },
            { name: 'mock', color: 'bg-mock', text: 'text-white', border: 'border-transparent' },
          ].map((item) => (
            <div key={item.name} className={`p-4 rounded-card border ${item.border} ${item.color} ${item.text} flex flex-col justify-between h-24 shadow-sm`}>
              <span className="font-mono text-xs opacity-80">{item.name}</span>
              <span className="font-semibold text-xs tracking-wider uppercase">Sample</span>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons & Interactive Targets */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-wide">2. Primary & Secondary Controls (≥ 44px / 56px Targets)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-5 bg-surface-1 rounded-card border border-border space-y-3">
            <span className="text-xs text-text-muted font-medium">Emergency Control</span>
            <button className="w-full h-14 bg-danger-solid hover:bg-danger text-white font-bold rounded-input text-base tracking-wider flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]">
              <Square className="w-5 h-5 fill-current" />
              EMERGENCY STOP
            </button>
          </div>

          <div className="p-5 bg-surface-1 rounded-card border border-border space-y-3">
            <span className="text-xs text-text-muted font-medium">Brand Accent Action</span>
            <button className="w-full h-14 bg-brand hover:opacity-90 text-brand-foreground font-semibold rounded-input text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98]">
              <Play className="w-5 h-5" />
              Start Inspection
            </button>
          </div>

          <div className="p-5 bg-surface-1 rounded-card border border-border space-y-3">
            <span className="text-xs text-text-muted font-medium">Surface Button</span>
            <button className="w-full h-14 bg-surface-2 hover:bg-surface-1 border border-border text-text font-medium rounded-input text-sm flex items-center justify-center gap-2 transition-colors">
              <Shield className="w-5 h-5 text-brand" />
              Unlock Controls
            </button>
          </div>
        </div>
      </section>

      {/* Status Chips */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-wide">3. Status Chips (Word + Icon Always)</h2>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-surface-2 border border-ok/40 text-ok text-xs font-medium">
            <Check className="w-3.5 h-3.5" />
            LIVE
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-surface-2 border border-replay/40 text-replay text-xs font-medium">
            <Radio className="w-3.5 h-3.5" />
            REPLAY
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-surface-2 border border-warn/40 text-warn text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            STALE
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-surface-2 border border-danger/40 text-danger text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            OFFLINE
          </span>
        </div>
      </section>

      {/* Inputs & Form Elements */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-wide">4. Inputs & Cards</h2>
        <div className="p-6 bg-surface-1 rounded-card border border-border max-w-md space-y-4">
          <label className="block text-sm font-medium text-text">
            Control PIN
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="mt-1 block w-full px-4 h-12 bg-surface-2 border border-border rounded-input text-text placeholder-text-muted focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
          </label>
          <div className="p-3 bg-surface-2 rounded-input border border-border text-xs text-text-muted">
            Test PIN: <code>1234</code>. Focus rings use token <code>--focus</code>.
          </div>
        </div>
      </section>
    </div>
  );
}
