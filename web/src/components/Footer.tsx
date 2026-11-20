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
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Full-stack Orchestrated Runtime & Engineering. Transforming one-line requirements into verified software through intelligent multi-agent orchestration.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Strict Git-Guard Autonomy Safe</span>
            </div>
          </div>

          {/* Core Platform */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentView('app-dashboard')} className="hover:text-amber-500 transition-colors">
                  Workspace Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('app-intake')} className="hover:text-amber-500 transition-colors">
                  Task Intake (/forge)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('app-live')} className="hover:text-amber-500 transition-colors">
                  3-Level Live Execution
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('app-memory')} className="hover:text-amber-500 transition-colors">
                  Project Memory (.forge)
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('app-report')} className="hover:text-amber-500 transition-colors">
                  13-Section Review Reports
                </button>
              </li>
            </ul>
          </div>

          {/* Architecture & Verifications */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Engineering Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentView('app-agents')} className="hover:text-amber-500 transition-colors">
                  26 Specialist Subagents
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('app-gates')} className="hover:text-amber-500 transition-colors">
                  G1–G15 Quality Gates
                </button>
              </li>
              <li>
                <span className="text-slate-400 dark:text-slate-500">Claude Code Plugin Core</span>
              </li>
              <li>
                <span className="text-slate-400 dark:text-slate-500">Google Antigravity Runtime</span>
              </li>
              <li>
                <span className="text-slate-400 dark:text-slate-500">Playwright & Chrome DevTools MCP</span>
              </li>
            </ul>
          </div>

          {/* Guarantees & Standards */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
              Guarantees
            </h4>
            <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
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
            <span className="font-mono text-slate-400">v1.2.0-stable</span>
            <span>WCAG 2.2 AA Compliant</span>
            <span>Zero Runtime Dependencies</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
