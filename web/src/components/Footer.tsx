import React from 'react';
import { Flame, ShieldCheck, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0A0D12] text-slate-600 dark:text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                <Flame className="w-4 h-4 fill-slate-950" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                FORGE
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Full-stack Orchestrated Runtime & Engineering. Transforming one-line requirements into verified software through intelligent multi-agent orchestration.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Strict Git-Guard Autonomy Safe</span>
            </div>
          </div>

          {/* Core Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3 font-mono">
              Platform Views
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={() => setCurrentView('app-dashboard')} 
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  Workspace Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('app-intake')} 
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  Task Intake Console
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('app-live')} 
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  Live Execution Monitor
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('app-memory')} 
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  Project Memory (.forge/)
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture & Capabilities */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3 font-mono">
              Architecture & Capabilities
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={() => setCurrentView('app-agents')} 
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  26 Specialist Subagents
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setCurrentView('app-gates')} 
                  className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                >
                  G1–G15 Quality Gates
                </button>
              </li>
              <li>
                <span className="text-slate-600 dark:text-slate-400">Claude Code Plugin Core</span>
              </li>
              <li>
                <span className="text-slate-600 dark:text-slate-400">Google Antigravity Runtime</span>
              </li>
              <li>
                <span className="text-slate-600 dark:text-slate-400">Playwright & Chrome DevTools MCP</span>
              </li>
            </ul>
          </div>

          {/* Guarantees & Standards */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3 font-mono">
              Guarantees
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>• Zero unapproved git commits</li>
              <li>• Disjoint file ownership concurrency</li>
              <li>• Pre-browser gate enforcement</li>
              <li>• Honest verification (never fakes pass)</li>
              <li>• Automatic Opus escalation on auth/schema</li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 FORGE Engineering. Built for Claude Code and Google Antigravity.
          </div>
          <div className="flex items-center gap-6">
            <span className="font-mono text-slate-600 dark:text-slate-400">v1.2.0-stable</span>
            <span>WCAG 2.2 AA Compliant</span>
            <span>Zero Runtime Dependencies</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
