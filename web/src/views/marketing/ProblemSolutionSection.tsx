import React, { useState } from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  FileWarning, 
  Cpu, 
  Layers, 
  ShieldAlert, 
  GitBranch, 
  Workflow
} from 'lucide-react';

export const ProblemSolutionSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'stages'>('comparison');

  return (
    <section className="py-20 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0A0D12]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Why Forge Exists
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            The Friction of Uncoordinated AI Coding
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Raw coding agents write code in isolation. Without structured orchestration, engineering teams spend more time managing AI confusion than building software.
          </p>
        </div>

        {/* Visual Split Comparison: Traditional AI vs FORGE Orchestration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-16">
          
          {/* Left: Traditional AI Coding Friction */}
          <div className="rounded-2xl border border-rose-200 dark:border-rose-950/60 bg-rose-50/30 dark:bg-rose-950/10 p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Traditional AI Coding
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Manual, fragmented and unverified
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-200/60 dark:border-rose-900/30">
                  <RefreshCw className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Repetitive Context Pasting</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Explaining the same project architecture, package manager, and conventions on every prompt.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-200/60 dark:border-rose-900/30">
                  <Cpu className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Manual Multi-Agent Babysitting</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Copying code between different windows, resolving conflicting file edits, and tracking task state by hand.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-200/60 dark:border-rose-900/30">
                  <FileWarning className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">No Pre-Flight Gates</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Hallucinated test passes, silent compiler errors, and unverified assumptions breaking production builds.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-rose-200/60 dark:border-rose-900/30">
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Risky Git Operations</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Agents running accidental git commit or push commands before human engineers have reviewed changes.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-rose-200/60 dark:border-rose-900/30 text-xs font-medium text-rose-600 dark:text-rose-400">
              Outcome: High cognitive fatigue & unverified code
            </div>
          </div>

          {/* Right: The FORGE Orchestration Solution */}
          <div className="rounded-2xl border border-amber-500/40 bg-white dark:bg-[#111620] p-8 flex flex-col justify-between shadow-xl relative overflow-hidden ring-1 ring-amber-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    The FORGE Solution
                  </h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    Autonomous, orchestrated & verified
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <Workflow className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">One Command Intake</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Simply type <code className="text-amber-500 font-mono">/forge &lt;request&gt;</code>. Forge classifies the size, maps risks, and structures a grounded specification.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Disjoint File Concurrency</h4>
                    <p className="text-xs text-slate-500 mt-0.5">26 specialist agents operate on strict file ownership boundaries, eliminating race conditions and merge collisions.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">G1–G15 Verification Barrier</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Pre-Browser gate ensures type checks, lint, and unit tests pass before headless Playwright & DevTools MCP run.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <GitBranch className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Strict Git Guard Autonomy</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Blocks commits and pushes automatically. Changes remain uncommitted in your working tree with indexed evidence.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span>Outcome: Finished engineering work ready for review</span>
              <span className="font-mono">Exit 0 Guaranteed</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
