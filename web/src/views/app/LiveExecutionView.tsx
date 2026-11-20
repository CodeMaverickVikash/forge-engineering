import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  FORGE_LIFECYCLE_PHASES, 
  SAMPLE_EXECUTION_EVENTS, 
  SAMPLE_FILE_CHANGES, 
  FORGE_QUALITY_GATES 
} from '../../lib/data';
import { 
  Terminal, 
  Play, 
  Pause, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Cpu, 
  FileCode, 
  Globe, 
  Layers, 
  ChevronRight, 
  XOctagon, 
  Check, 
  Flame,
  Activity,
  FileCheck2,
  RefreshCw
} from 'lucide-react';

export const LiveExecutionView: React.FC = () => {
  const { selectedTask, tasks, setSelectedTaskId, setCurrentView } = useApp();
  
  // Disclosure levels: 1 = High-level, 2 = Mid-level (agent events), 3 = Deep-level (terminal & diffs)
  const [disclosureLevel, setDisclosureLevel] = useState<1 | 2 | 3>(2);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeTabLevel3, setActiveTabLevel3] = useState<'terminal' | 'diffs' | 'devtools'>('terminal');

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Task Header & Status Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                selectedTask.status === 'VERIFIED'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse'
              }`}>
                {selectedTask.status}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {selectedTask.slug}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs font-mono text-slate-400">Size {selectedTask.size}</span>
              {selectedTask.modelEscalated && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Opus Model Escalated
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedTask.title}
            </h2>
          </div>

          {/* Human-In-The-Loop Contextual Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-500" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={() => setCurrentView('app-report')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Inspect Report</span>
            </button>
          </div>
        </div>

        {/* Level Selector (Progressive Disclosure) */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Progressive Disclosure:
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium">
              <button
                onClick={() => setDisclosureLevel(1)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  disclosureLevel === 1 
                    ? 'bg-white dark:bg-[#111620] text-slate-900 dark:text-white font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Level 1: High-Level
              </button>
              <button
                onClick={() => setDisclosureLevel(2)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  disclosureLevel === 2 
                    ? 'bg-white dark:bg-[#111620] text-slate-900 dark:text-white font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Level 2: Agent Events & Files
              </button>
              <button
                onClick={() => setDisclosureLevel(3)}
                className={`px-3 py-1 rounded-md transition-colors ${
                  disclosureLevel === 3 
                    ? 'bg-white dark:bg-[#111620] text-slate-900 dark:text-white font-bold shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Level 3: Terminal & Diff
              </button>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-500 hidden sm:block">
            Pre-Browser Gate: <strong className="text-emerald-500">OPEN</strong>
          </div>
        </div>
      </div>

      {/* ================= LEVEL 1: HIGH-LEVEL TIMELINE & STATUS ================= */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Lifecycle Phase Progress: {selectedTask.phase}/10 ({selectedTask.phaseName})
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-500 font-semibold">
            {selectedTask.gatesPassed} of {selectedTask.totalGates} Gates Satisfied
          </span>
        </div>

        {/* 10-Phase Horizontal Stepper */}
        <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
          {FORGE_LIFECYCLE_PHASES.map((p) => {
            const isCompleted = selectedTask.phase > p.phase || selectedTask.status === 'VERIFIED';
            const isCurrent = selectedTask.phase === p.phase && selectedTask.status === 'RUNNING';
            return (
              <div
                key={p.phase}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-400'
                }`}
              >
                <div className="text-[10px] font-mono font-bold">0{p.phase}</div>
                <div className="text-[10px] font-semibold truncate">{p.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= LEVEL 2: AGENT ACTIVITY & FILE CHANGES ================= */}
      {(disclosureLevel === 2 || disclosureLevel === 1) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Real-time Agent Event Stream */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                  Orchestrated Event Stream
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Foreground Wait Active</span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {SAMPLE_EXECUTION_EVENTS.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-400">{ev.timestamp}</span>
                      {ev.agent && (
                        <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                          {ev.agent}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{ev.title}</span>
                    </div>
                    {ev.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {ev.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pl-14">
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
              <span className="text-[11px] font-mono text-emerald-500">0 Overlaps</span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {SAMPLE_FILE_CHANGES.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5"
                >
                  <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {file.path}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="text-amber-500">{file.owner}</span>
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
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden font-mono text-xs">
          
          {/* Level 3 Tabs */}
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTabLevel3('terminal')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  activeTabLevel3 === 'terminal' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw Terminal Output
              </button>
              <button
                onClick={() => setActiveTabLevel3('diffs')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  activeTabLevel3 === 'diffs' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Uncommitted Diff Inspector
              </button>
              <button
                onClick={() => setActiveTabLevel3('devtools')}
                className={`px-3 py-1 rounded-md text-xs font-semibold ${
                  activeTabLevel3 === 'devtools' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chrome DevTools MCP Trace
              </button>
            </div>

            <span className="text-[11px] text-slate-500">
              Session PID: 8192 [Clean]
            </span>
          </div>

          {/* Tab 1: Terminal logs */}
          {activeTabLevel3 === 'terminal' && (
            <div className="p-4 space-y-1.5 max-h-[480px] overflow-y-auto leading-relaxed text-slate-300">
              <p className="text-slate-500">$ node skills/forge/scripts/validation-gate.mjs gate --task live-notification-center</p>
              <p className="text-emerald-400">[G1 Syntax]: prettier check passed (0 violations)</p>
              <p className="text-emerald-400">[G2 Types]: tsc --noEmit returned 0 compiler errors</p>
              <p className="text-emerald-400">[G3 Lint]: eslint passed with 0 warnings</p>
              <p className="text-emerald-400">[G4 Unit Tests]: 42 tests passed in 4.62s</p>
              <p className="text-amber-400">[G9 Pre-Browser Gate]: Status OPEN. Exit code 0.</p>
              <p className="text-slate-400">Launching Playwright headless Chromium runner on port 3000...</p>
              <p className="text-emerald-400">✔ Journey 1: Notification bell click opens dropdown</p>
              <p className="text-emerald-400">✔ Journey 2: Mark-all-read updates badge count to 0</p>
              <p className="text-emerald-400">✔ Journey 3: Audio toggle persists across page reload</p>
              <p className="text-slate-400">Saved screenshots to .forge/tasks/live-notification-center/evidence/</p>
            </div>
          )}

          {/* Tab 2: Diff inspector */}
          {activeTabLevel3 === 'diffs' && (
            <div className="p-4 space-y-0.5 max-h-[480px] overflow-y-auto text-xs">
              <div className="text-slate-500">diff --git a/src/components/NotificationBell.tsx b/src/components/NotificationBell.tsx</div>
              <div className="text-slate-500">index e2b49a1..78c1092 100644</div>
              <div className="text-slate-400">{"@@ -14,6 +14,24 @@ export function NotificationBell() {"}</div>
              <div className="text-emerald-400">{"+  const { unreadCount, toggleSound, soundEnabled } = useNotifications();"}</div>
              <div className="text-emerald-400">{"+  const [isOpen, setIsOpen] = useState(false);"}</div>
              <div className="text-emerald-400">{"+"}</div>
              <div className="text-emerald-400">{"+  return ("}</div>
              <div className="text-emerald-400">{"+    <div className=\"relative inline-block\">"}</div>
              <div className="text-emerald-400">{"+      <button aria-label=\"unread alerts\" onClick={() => setIsOpen(!isOpen)}>"}</div>
              <div className="text-emerald-400">{"+        <Bell className=\"w-5 h-5 text-slate-100\" />"}</div>
              <div className="text-emerald-400">{"+        {unreadCount > 0 && ("}</div>
              <div className="text-emerald-400">{"+          <span className=\"absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] bg-amber-500 font-bold rounded-full text-slate-950\">"}</div>
              <div className="text-emerald-400">{"+            {unreadCount}"}</div>
              <div className="text-emerald-400">{"+          </span>"}</div>
              <div className="text-emerald-400">{"+        )}"}</div>
              <div className="text-emerald-400">{"+      </button>"}</div>
              <div className="text-emerald-400">{"+    </div>"}</div>
              <div className="text-emerald-400">{"+  );"}</div>
              <div className="text-slate-400">{"}"}</div>
            </div>
          )}

          {/* Tab 3: Chrome DevTools MCP Trace */}
          {activeTabLevel3 === 'devtools' && (
            <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto text-xs">
              <div className="text-emerald-400">✔ Connected to Chrome DevTools MCP via stdio transport</div>
              <div className="text-slate-400">[Console]: Page loaded at http://localhost:3000/ (DOM ready 124ms)</div>
              <div className="text-slate-400">[Network]: GET /api/notifications/stream 200 OK (text/event-stream)</div>
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
