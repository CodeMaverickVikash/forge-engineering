import React, { useState } from 'react';
import { FORGE_QUALITY_GATES } from '../../lib/data';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Code2, 
  Cpu, 
  Lock, 
  Terminal, 
  Eye, 
  FileCheck2,
  Layers
} from 'lucide-react';

export const QualityGatesShowcaseSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = [
    'All',
    'Static Analysis',
    'Automated Tests',
    'Security & Risk',
    'Browser & UX',
    'Review & Integrity'
  ];

  const filteredGates = activeCategory === 'All'
    ? FORGE_QUALITY_GATES
    : FORGE_QUALITY_GATES.filter((g) => g.category === activeCategory);

  return (
    <section id="quality-gates" className="py-24 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0A0D12]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Honest Verification
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            G1–G15 Quality Verification Matrix
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Pass or fail always comes from real test, compiler, and browser tool output. Missing tools are never reported as passed, and browser automation waits for an OPEN Pre-Browser gate.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Quality Gates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {filteredGates.map((gate) => (
            <div
              key={gate.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-5 shadow-sm hover:border-amber-500/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/20">
                      {gate.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      {gate.category}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    {gate.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                  {gate.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {gate.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 font-mono text-[11px] flex items-center justify-between text-slate-500">
                <span className="truncate max-w-[200px]" title={gate.evidence}>
                  {gate.evidence}
                </span>
                <span className="text-slate-400 shrink-0">{gate.executionTime}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight Banner: Pre-Browser Gate G9 & Browser QA G10/G11 */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Hard Completion Barrier
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-500">G9 Pre-Browser Gate</span>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Playwright Journeys + Chrome DevTools MCP
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Static checks and unit tests run first. Browser and device verification wait for validation-gate.mjs to exit 0. Chrome DevTools captures real-time console exceptions, failed network calls, and records screenshots in evidence/.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Exit Code: 0 (OPEN)</div>
              <div className="text-[11px] text-slate-500 font-mono">0 Console Errors</div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs font-mono">
              VERIFIED
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
