import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FORGE_LIFECYCLE_PHASES, 
  SAMPLE_EXECUTION_EVENTS, 
  SAMPLE_FILE_CHANGES 
} from '../../lib/data';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Cpu, 
  FileCode, 
  FileCheck2, 
  Copy, 
  Check, 
  Activity, 
  FastForward, 
  StepForward,
  Filter,
  X,
  Layers,
  Terminal,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export const LiveExecutionView: React.FC = () => {
  const { selectedTask, tasks, setSelectedTaskId, setCurrentView, stepTaskPhase, fastForwardTask } = useApp();
  
  // Disclosure levels: 1 = Macro Overview, 2 = Agent Telemetry, 3 = Code & Traces
  const [disclosureLevel, setDisclosureLevel] = useState<1 | 2 | 3>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeTabLevel3, setActiveTabLevel3] = useState<'terminal' | 'diffs' | 'devtools'>('terminal');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | null>(null);
  const [copiedTerminal, setCopiedTerminal] = useState(false);

  // Keyboard hotkeys: 1, 2, 3 to switch disclosure levels directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') setDisclosureLevel(1);
      if (e.key === '2') setDisclosureLevel(2);
      if (e.key === '3') setDisclosureLevel(3);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const events = selectedTask.events || SAMPLE_EXECUTION_EVENTS;
  const files = selectedTask.files || SAMPLE_FILE_CHANGES;
  const filteredEvents = selectedPhaseFilter !== null
    ? events.filter((e) => e.phase === selectedPhaseFilter)
    : events;

  const terminalOutput = `$ node skills/forge/scripts/validation-gate.mjs gate --task ${selectedTask.slug}
[G1 Syntax]: prettier check passed (0 violations)
[G2 Types]: tsc --noEmit returned 0 compiler errors across 14 modules
[G3 Lint]: eslint passed with 0 warnings
[G4 Unit Tests]: 42 tests passed in 4.62s
[G9 Pre-Browser Gate]: Status OPEN. Exit code 0.
Launching Playwright headless Chromium runner on port 3000...
✔ Journey 1: Simulated target user interaction workflow
✔ Journey 2: Verified state synchronization & zero console errors
✔ Journey 3: Audio/responsive layout persisted across viewports
Saved screenshots to .forge/tasks/${selectedTask.slug}/evidence/`;

  const handleCopyTerminal = () => {
    navigator.clipboard.writeText(terminalOutput);
    setCopiedTerminal(true);
    setTimeout(() => setCopiedTerminal(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Task Header & Status Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                selectedTask.status === 'VERIFIED'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 animate-pulse'
              }`}>
                {selectedTask.status}
              </span>
              
              {/* Task Switcher Dropdown */}
              <select
                aria-label="Switch active task"
                value={selectedTask.id}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.slug} ({t.status})
                  </option>
                ))}
              </select>

              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs font-mono text-slate-500">Size {selectedTask.size}</span>
              {selectedTask.modelEscalated && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold">
                  Opus Model Escalated
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedTask.title}
            </h2>
          </div>

          {/* Simulation & Navigation Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTask.status === 'RUNNING' && (
              <>
                <button
                  onClick={() => stepTaskPhase(selectedTask.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  title="Step forward 1 lifecycle phase"
                  aria-label="Step forward 1 lifecycle phase"
                >
                  <StepForward className="w-3.5 h-3.5 text-amber-500" />
                  <span>Step</span>
                </button>
                <button
                  onClick={() => fastForwardTask(selectedTask.id)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  title="Fast forward to verified report"
                  aria-label="Fast forward to verified report"
                >
                  <FastForward className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Complete</span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label={isPaused ? 'Resume orchestration execution' : 'Pause orchestration execution'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={() => setCurrentView('app-report')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-sm"
              aria-label="Inspect 13-Section Engineering Report"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Inspect Report</span>
            </button>
          </div>
        </div>

        {/* Level Selector (Progressive Disclosure) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-3">
          <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Progressive disclosure levels">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Disclosure (Keys 1-3):
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium">
              <button
                role="tab"
                aria-selected={disclosureLevel === 1}
                onClick={() => setDisclosureLevel(1)}
                className={`px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  disclosureLevel === 1 
                    ? 'bg-white dark:bg-[#111620] text-slate-900 dark:text-white font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Level 1: Macro
              </button>
              <button
                role="tab"
                aria-selected={disclosureLevel === 2}
                onClick={() => setDisclosureLevel(2)}
                className={`px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  disclosureLevel === 2 
                    ? 'bg-white dark:bg-[#111620] text-slate-900 dark:text-white font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Level 2: Telemetry
              </button>
              <button
                role="tab"
                aria-selected={disclosureLevel === 3}
                onClick={() => setDisclosureLevel(3)}
                className={`px-3 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  disclosureLevel === 3 
                    ? 'bg-white dark:bg-[#111620] text-slate-900 dark:text-white font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Level 3: Code & Trace
              </button>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
            <span>Pre-Browser Gate:</span>
            <strong className="text-emerald-500 font-bold">OPEN (G1–G8 Pass)</strong>
          </div>
        </div>
      </div>

      {/* ================= LEVEL 1 & 2 SHARED: 10-PHASE STEPPER ================= */}
      {(disclosureLevel === 1 || disclosureLevel === 2) && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                Lifecycle Phase: {selectedTask.phase}/10 ({selectedTask.phaseName})
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-500 font-semibold">
                {selectedTask.gatesPassed} of {selectedTask.totalGates} Gates Satisfied
              </span>
              {selectedPhaseFilter !== null && (
                <button
                  onClick={() => setSelectedPhaseFilter(null)}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 hover:bg-amber-500/20"
                >
                  <span>Filtering Phase {selectedPhaseFilter}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 10-Phase Horizontal Stepper with Interactive Filter */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5" role="tablist" aria-label="10 Lifecycle Phases">
            {FORGE_LIFECYCLE_PHASES.map((p) => {
              const isCompleted = selectedTask.phase > p.phase || selectedTask.status === 'VERIFIED';
              const isCurrent = selectedTask.phase === p.phase && selectedTask.status === 'RUNNING';
              const isFilterActive = selectedPhaseFilter === p.phase;
              return (
                <button
                  key={p.phase}
                  type="button"
                  onClick={() => setSelectedPhaseFilter(isFilterActive ? null : p.phase)}
                  role="tab"
                  aria-selected={isFilterActive}
                  aria-label={`Phase ${p.phase}: ${p.name}`}
                  className={`p-2 rounded-lg border text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    isFilterActive
                      ? 'ring-2 ring-amber-500 bg-amber-500/20 border-amber-500 font-bold'
                      : isCurrent
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30'
                      : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold">0{p.phase}</div>
                  <div className="text-[10px] font-semibold truncate">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= LEVEL 1 ONLY: MACRO SUMMARY CARDS ================= */}
      {disclosureLevel === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
          
          {/* Active Specialist Team */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Cpu className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Assigned Specialists
              </h3>
            </div>
            <div className="space-y-2">
              {selectedTask.specialists.map((spec) => (
                <div key={spec} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{spec}</span>
                  <span className="text-[10px] text-emerald-500 font-bold">Active</span>
                </div>
              ))}
            </div>
          </div>

          {/* Concurrency & File Disjointness */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <FileCode className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Concurrency Isolation
              </h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
                <span>Disjoint Boundary Verification:</span>
                <span className="font-mono font-bold">PASS (0 Overlaps)</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-xs">
                Each engineer writes only to exclusive file sets defined in plan.md. No concurrent race conditions or write collisions permitted.
              </p>
            </div>
          </div>

          {/* Safe Autonomy Verification */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Safe Autonomy Verification
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Git Guard:</span>
                <span className="font-mono text-emerald-500 font-bold">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Unapproved Commits:</span>
                <span className="font-mono text-emerald-500 font-bold">0 Created</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Target Branch:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTask.branch}</span>
              </div>
              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                All changes held uncommitted in working tree for developer review.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ================= LEVEL 2: AGENT ACTIVITY & FILE CHANGES ================= */}
      {disclosureLevel === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
          
          {/* Real-time Agent Event Stream */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Orchestrated Event Stream ({filteredEvents.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Foreground Wait Active</span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2" tabIndex={0} aria-label="Event stream">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{ev.timestamp}</span>
                      {ev.agent && (
                        <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          {ev.agent}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{ev.title}</span>
                    </div>
                    {ev.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ev.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-14">
                    {ev.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Disjoint File Ownership Panel */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Disjoint File Ownership
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-500 font-bold">0 Overlaps</span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto" tabIndex={0} aria-label="Modified files">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5"
                >
                  <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {file.path}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{file.owner}</span>
                    <span className="text-emerald-500">+{file.linesAdded} / -{file.linesRemoved}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ================= LEVEL 3: RAW TERMINAL, DIFF & DEVTOOLS ================= */}
      {disclosureLevel === 3 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden font-mono text-xs animate-in fade-in duration-150">
          
          {/* Level 3 Tabs */}
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between flex-wrap gap-2" role="tablist" aria-label="Level 3 code tabs">
            <div className="flex items-center gap-2">
              <button
                role="tab"
                aria-selected={activeTabLevel3 === 'terminal'}
                onClick={() => setActiveTabLevel3('terminal')}
                className={`px-3 py-1 rounded-md text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  activeTabLevel3 === 'terminal' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw Terminal Output
              </button>
              <button
                role="tab"
                aria-selected={activeTabLevel3 === 'diffs'}
                onClick={() => setActiveTabLevel3('diffs')}
                className={`px-3 py-1 rounded-md text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  activeTabLevel3 === 'diffs' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Uncommitted Diff Inspector
              </button>
              <button
                role="tab"
                aria-selected={activeTabLevel3 === 'devtools'}
                onClick={() => setActiveTabLevel3('devtools')}
                className={`px-3 py-1 rounded-md text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  activeTabLevel3 === 'devtools' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chrome DevTools MCP Trace
              </button>
            </div>

            <div className="flex items-center gap-3">
              {activeTabLevel3 === 'terminal' && (
                <button
                  onClick={handleCopyTerminal}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {copiedTerminal ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedTerminal ? 'Copied' : 'Copy Output'}</span>
                </button>
              )}
              <span className="text-[11px] text-slate-500">
                Session PID: 8192 [Clean]
              </span>
            </div>
          </div>

          {/* Tab 1: Terminal logs */}
          {activeTabLevel3 === 'terminal' && (
            <div className="p-4 space-y-1.5 max-h-[480px] overflow-y-auto leading-relaxed text-slate-300" tabIndex={0} aria-label="Terminal output log">
              <p className="text-slate-500">$ node skills/forge/scripts/validation-gate.mjs gate --task {selectedTask.slug}</p>
              <p className="text-emerald-400">[G1 Syntax]: prettier check passed (0 violations)</p>
              <p className="text-emerald-400">[G2 Types]: tsc --noEmit returned 0 compiler errors across 14 modules</p>
              <p className="text-emerald-400">[G3 Lint]: eslint passed with 0 warnings</p>
              <p className="text-emerald-400">[G4 Unit Tests]: 42 tests passed in 4.62s</p>
              <p className="text-amber-400">[G9 Pre-Browser Gate]: Status OPEN. Exit code 0.</p>
              <p className="text-slate-400">Launching Playwright headless Chromium runner on port 3000...</p>
              <p className="text-emerald-400">✔ Journey 1: Simulated target user interaction workflow</p>
              <p className="text-emerald-400">✔ Journey 2: Verified state synchronization & zero console errors</p>
              <p className="text-emerald-400">✔ Journey 3: Audio/responsive layout persisted across viewports</p>
              <p className="text-slate-400">Saved screenshots to .forge/tasks/{selectedTask.slug}/evidence/</p>
            </div>
          )}

          {/* Tab 2: Diff inspector */}
          {activeTabLevel3 === 'diffs' && (
            <div className="p-4 space-y-0.5 max-h-[480px] overflow-y-auto text-xs" tabIndex={0} aria-label="Uncommitted code diff">
              <div className="text-slate-500">diff --git a/{files[0]?.path || 'src/features/task.ts'} b/{files[0]?.path || 'src/features/task.ts'}</div>
              <div className="text-slate-500">index e2b49a1..78c1092 100644</div>
              <div className="text-slate-400">{"@@ -14,6 +14,24 @@ export function executeTask() {"}</div>
              <div className="text-emerald-400">{"+  const { status, phase, gates } = useTaskContext();"}</div>
              <div className="text-emerald-400">{"+  const [isVerified, setIsVerified] = useState(true);"}</div>
              <div className="text-emerald-400">{"+"}</div>
              <div className="text-emerald-400">{"+  return ("}</div>
              <div className="text-emerald-400">{"+    <div className=\"rounded-2xl border border-slate-200\">"}</div>
              <div className="text-emerald-400">{"+      <button aria-label=\"open inspection\" onClick={() => setIsVerified(!isVerified)}>"}</div>
              <div className="text-emerald-400">{"+        <ShieldCheck className=\"w-5 h-5 text-emerald-500\" />"}</div>
              <div className="text-emerald-400">{"+        <span>Verified (0 commits created)</span>"}</div>
              <div className="text-emerald-400">{"+      </button>"}</div>
              <div className="text-emerald-400">{"+    </div>"}</div>
              <div className="text-emerald-400">{"+  );"}</div>
              <div className="text-slate-400">{"}"}</div>
            </div>
          )}

          {/* Tab 3: Chrome DevTools MCP Trace */}
          {activeTabLevel3 === 'devtools' && (
            <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto text-xs" tabIndex={0} aria-label="DevTools MCP trace">
              <div className="text-emerald-400">✔ Connected to Chrome DevTools MCP via stdio transport</div>
              <div className="text-slate-400">[Console]: Page loaded at http://localhost:3000/ (DOM ready 124ms)</div>
              <div className="text-slate-400">[Network]: GET /api/telemetry/stream 200 OK (text/event-stream)</div>
              <div className="text-slate-400">[Performance]: First Contentful Paint: 210ms | Cumulative Layout Shift: 0.00</div>
              <div className="text-emerald-400">✔ 0 uncaught JavaScript exceptions detected in page lifecycle</div>
              <div className="text-emerald-400">✔ 0 network 4xx or 5xx failures detected</div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
