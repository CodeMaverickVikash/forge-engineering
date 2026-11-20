import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Terminal, 
  Search, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  ExternalLink,
  ChevronRight,
  Flame,
  LayoutDashboard
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentView, setCurrentView, setCommandPaletteOpen } = useApp();

  const isAppView = currentView.startsWith('app-');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0A0D12]/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Version Indicator */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('marketing')}
            className="flex items-center gap-2.5 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
            aria-label="Forge Homepage"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
              <Flame className="w-5 h-5 fill-slate-950 stroke-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                  FORGE
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  PaaS Core
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium hidden sm:block">
                AI Engineering Orchestration
              </p>
            </div>
          </button>
        </div>

        {/* Center Navigation Links (Marketing vs App context) */}
        {!isAppView ? (
          <nav aria-label="Main marketing navigation" className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            <button 
              onClick={() => {
                const el = document.getElementById('product-demo');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-md hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Demo
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-md hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              How It Works
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('specialists');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-md hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              26 Specialists
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('quality-gates');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-md hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Quality Gates
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('integrations');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 rounded-md hover:text-amber-700 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Architecture
            </button>
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-1 text-xs font-mono bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Runtime: Claude Code + Antigravity (Connected)</span>
          </div>
        )}

        {/* Right Action Tools: Command Palette, Theme, Mode Toggle, CTA */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search / Cmd+K */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            title="Command Palette (Cmd+K)"
            aria-label="Search and run commands (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search / Cmd</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
              ⌘K
            </kbd>
          </button>


          {/* View Switch Button: Marketing vs App Console */}
          {isAppView ? (
            <button
              onClick={() => setCurrentView('marketing')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Marketing</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentView('app-dashboard')}
              className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-sm shadow-amber-500/25 flex items-center gap-1.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Launch Console</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
