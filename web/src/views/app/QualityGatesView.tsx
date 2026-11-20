import React, { useState } from 'react';
import { FORGE_QUALITY_GATES } from '../../lib/data';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Globe, 
  Terminal, 
  Layers, 
  Eye, 
  Clock, 
  Code2, 
  AlertTriangle,
  Play,
  X,
  ExternalLink
} from 'lucide-react';

export const QualityGatesView: React.FC = () => {
  const [selectedGateId, setSelectedGateId] = useState<string>('G9');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);

  const categories = [
    'All',
    'Static Analysis',
    'Automated Tests',
    'Security & Risk',
    'Browser & UX',
    'Review & Integrity'
  ];

  const filteredGates = selectedCategory === 'All'
    ? FORGE_QUALITY_GATES
    : FORGE_QUALITY_GATES.filter((g) => g.category === selectedCategory);

  const selectedGate = FORGE_QUALITY_GATES.find((g) => g.id === selectedGateId) || FORGE_QUALITY_GATES[8];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>PHASE 7: VERIFICATION & BROWSER QA GATING</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Quality Gates (G1–G15) & Pre-Browser Gate
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Static checks, type compilation, linting, and unit tests run in one parallel batch. Browser testing is strictly blocked until the Pre-Browser Gate exits 0.
        </p>
      </div>

      {/* Pre-Browser Gate Status Callout */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                GATE BARRIER G9: OPEN
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500">Exit Code: 0</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              Browser QA Unlocked & Verified
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              validation-gate.mjs confirmed passing type checks, zero lint errors, and 100% green regression tests before initiating Playwright journeys.
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs font-mono shrink-0">
          ALL 15 GATES SATISFIED
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Quality gate categories">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Gates Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Filtered Gates List */}
        <div className="lg:col-span-5 space-y-2">
          {filteredGates.map((gate) => {
            const isSelected = selectedGateId === gate.id;
            return (
              <button
                key={gate.id}
                type="button"
                onClick={() => setSelectedGateId(gate.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white ring-1 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 w-7 text-center">
                    {gate.id}
                  </span>
                  <div>
                    <div className="text-xs font-bold">{gate.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{gate.category}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
                    {gate.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Selected Gate Evidence Inspector */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                Gate {selectedGate.id}: {selectedGate.category}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {selectedGate.name}
              </h3>
            </div>

            <span className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
              {selectedGate.status}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {selectedGate.description}
          </p>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Recorded Verification Evidence
            </span>
            <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 space-y-2">
              <div className="text-slate-500"># Command & Proof Trace</div>
              <div className="text-emerald-400">{selectedGate.evidence}</div>
              <div className="text-slate-500 text-[11px] pt-2 border-t border-slate-800 flex justify-between">
                <span>Duration: {selectedGate.executionTime}</span>
                <span>Exit code: 0</span>
              </div>
            </div>
          </div>

          {selectedGate.id === 'G10' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Playwright Journey Evidence Screenshot:
                </span>
                <button
                  type="button"
                  onClick={() => setScreenshotModalOpen(true)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Full Lightbox</span>
                </button>
              </div>

              <div 
                onClick={() => setScreenshotModalOpen(true)}
                className="w-full h-36 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer hover:border-amber-500/40 transition-colors group"
              >
                <Globe className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono font-semibold">.forge/tasks/live-notification-center/evidence/journey-01.png</span>
                <span className="text-[10px] text-slate-500">Click to expand high-resolution preview</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-500">Verification Engine:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
              skills/forge/scripts/validation-gate.mjs
            </span>
          </div>
        </div>

      </div>

      {/* Screenshot Lightbox Modal */}
      {screenshotModalOpen && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label="Screenshot Lightbox Preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setScreenshotModalOpen(false)}
        >
          <div 
            className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="font-mono text-xs text-slate-300 font-bold">
                Playwright Journey 01: Verification Capture
              </span>
              <button
                type="button"
                onClick={() => setScreenshotModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                aria-label="Close screenshot preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center bg-slate-950 min-h-[300px] text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="font-mono text-sm text-white font-bold">
                Browser Journey Completed with 0 Console Errors
              </div>
              <div className="text-xs text-slate-400 max-w-md">
                Verified DOM element visibility, focus management, unread notification badge count update to 0, and persistent audio toggles.
              </div>
              <div className="text-[11px] font-mono text-emerald-400 pt-2">
                1440x900 • Chrome DevTools MCP Verified • 0 Network 5xx
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
