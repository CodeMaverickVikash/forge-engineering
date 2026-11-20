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
  Play
} from 'lucide-react';

export const QualityGatesView: React.FC = () => {
  const [selectedGateId, setSelectedGateId] = useState<string>('G9');

  const selectedGate = FORGE_QUALITY_GATES.find((g) => g.id === selectedGateId) || FORGE_QUALITY_GATES[8];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>PHASE 7: VERIFICATION & BROWSER QA GATING</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Quality Gates (G1–G15) & Pre-Browser Gate
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Static checks, type compilation, linting, and unit tests run in one parallel batch. Browser testing is strictly blocked until the Pre-Browser Gate exits 0.
        </p>
      </div>

      {/* Pre-Browser Gate Status Callout */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
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
              Validation-gate.mjs confirmed passing type checks, zero lint errors, and 100% green regression tests before initiating Playwright journeys.
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs font-mono shrink-0">
          ALL 15 GATES SATISFIED
        </div>
      </div>

      {/* Gates Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: 15 Gates List */}
        <div className="lg:col-span-5 space-y-2">
          {FORGE_QUALITY_GATES.map((gate) => {
            const isSelected = selectedGateId === gate.id;
            return (
              <button
                key={gate.id}
                onClick={() => setSelectedGateId(gate.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white ring-1 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-500 w-7 text-center">
                    {gate.id}
                  </span>
                  <div>
                    <div className="text-xs font-bold">{gate.name}</div>
                    <div className="text-[10px] text-slate-400">{gate.category}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
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
              <div className="text-xs font-mono font-bold text-amber-500">
                Gate {selectedGate.id}: {selectedGate.category}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {selectedGate.name}
              </h3>
            </div>

            <span className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-500 font-mono text-xs font-bold border border-emerald-500/20">
              {selectedGate.status}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {selectedGate.description}
          </p>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
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
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Playwright Indexed Evidence
              </span>
              <p className="text-xs text-slate-500">
                Screenshots recorded during live DOM interaction:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-amber-500">
                <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  📷 evidence/journey-01-bell-opened.png
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  📷 evidence/journey-02-mark-all-read.png
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
