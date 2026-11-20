import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Terminal, 
  Cpu, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  GitBranch, 
  FileCode, 
  AlertTriangle,
  Play,
  RotateCw,
  FolderGit2
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { tasks, setSelectedTaskId, setCurrentView, projectContext } = useApp();

  const activeTask = tasks.find((t) => t.status === 'RUNNING') || tasks[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      
      {/* Top Banner: Quick Intake Action */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-50 dark:via-[#111620] to-white dark:to-[#111620] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
            <Terminal className="w-4 h-4" />
            <span>DISPATCH AN AUTONOMOUS ENGINEERING TASK</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Transform Any Software Request into Verified Code
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
            Type <code className="text-amber-500 font-mono">/forge &lt;request&gt;</code> to explore your codebase, generate a grounded spec, assemble parallel specialists, and verify results with Playwright and Chrome DevTools.
          </p>
        </div>

        <button
          onClick={() => setCurrentView('app-intake')}
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 shrink-0 group"
        >
          <span>Launch Task Intake Console</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Engineering Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Verification Assurance</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">100%</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Zero hallucinated passes</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Quality Gates Enforced</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">15 Gates</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" />
            <span>G1–G15 + Pre-browser barrier</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Safe Autonomy Policy</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">0 Commits</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
            <span>Uncommitted diffs for human review</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">Discovered Signatures</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">116 Stacks</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
            <span>Fast detect-stack detector</span>
          </div>
        </div>
      </div>

      {/* Active / Current Task Spotlight */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Active Task Spotlight: <span className="font-mono text-amber-500">{activeTask.slug}</span>
            </h3>
          </div>
          <button
            onClick={() => {
              setSelectedTaskId(activeTask.id);
              setCurrentView('app-live');
            }}
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-1"
          >
            <span>Open 3-Level Live Monitor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {activeTask.title}
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono text-xs text-slate-700 dark:text-slate-300">
              {activeTask.request}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {activeTask.summary}
            </p>
          </div>

          <div className="md:col-span-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-500">{activeTask.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Size & Phase:</span>
              <span className="text-slate-800 dark:text-slate-200">Size {activeTask.size} • Phase {activeTask.phase}/10 ({activeTask.phaseName})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Files Touched:</span>
              <span className="text-slate-800 dark:text-slate-200">{activeTask.filesChanged} (Disjoint)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quality Gates:</span>
              <span className="text-emerald-500">{activeTask.gatesPassed}/{activeTask.totalGates} Passed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Recent Engineering Orchestrations
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">{tasks.length} Total Runs</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-x-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                setSelectedTaskId(task.id);
                setCurrentView('app-live');
              }}
              className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    task.status === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : task.status === 'RUNNING'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse'
                      : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                  }`}>
                    {task.status}
                  </span>
                  <span className="font-mono text-xs text-slate-500 font-semibold">
                    {task.slug}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs text-slate-400">Size {task.size}</span>
                </div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white truncate group-hover:text-amber-500 transition-colors">
                  {task.title}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-500 shrink-0">
                <span>{task.filesChanged} files</span>
                <span>{task.startedAt}</span>
                <button className="p-1 rounded text-slate-400 group-hover:text-amber-500">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
