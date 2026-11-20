import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  FileCode, 
  ShieldCheck, 
  Cpu, 
  Terminal,
  FolderGit2,
  Lock,
  Layers
} from 'lucide-react';

export const ProjectMemoryView: React.FC = () => {
  const { projectContext } = useApp();
  const [activeTab, setActiveTab] = useState<'knowledge' | 'context' | 'git'>('knowledge');
  const [syncing, setSyncing] = useState<boolean>(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-1">
            <Database className="w-4 h-4" />
            <span>PROJECT TRANSPARENCY & MEMORY LAYER</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Project Memory & Grounded Context
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Forge inspects and maintains persistent engineering knowledge in <code className="text-amber-500 font-mono">.forge/</code>. The codebase is always the single source of truth.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-400 dark:hover:text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 shrink-0 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Revalidating Memory...' : 'Revalidate Knowledge'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'knowledge'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Durable Conventions (.forge/knowledge.md)</span>
        </button>

        <button
          onClick={() => setActiveTab('context')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'context'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Discovered Stack (.forge/context.json)</span>
        </button>

        <button
          onClick={() => setActiveTab('git')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'git'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Git State & Safe Autonomy Guard</span>
        </button>
      </div>

      {/* TAB 1: KNOWLEDGE */}
      {activeTab === 'knowledge' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectContext.durableKnowledge.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{item.title}</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">{item.lastVerified}</span>
              </div>
              
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {item.convention}
              </p>

              <div className="text-[11px] font-mono text-slate-400 truncate flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-500" />
                <span>Source: {item.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: DETECTED STACK (CONTEXT.JSON) */}
      {activeTab === 'context' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Grounded Technology Stack Signature
              </h3>
              <p className="text-xs text-slate-500">
                Extracted by detect-stack.mjs directly from lockfiles, package manifests, and imports.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              116 Stack Signatures Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase">Runtime & Language</span>
              <div className="font-bold text-slate-900 dark:text-white mt-1">{projectContext.stack.runtime}</div>
              <div className="text-[11px] text-amber-500 mt-1">{projectContext.stack.languages.join(', ')}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase">Frameworks & UI</span>
              <div className="font-bold text-slate-900 dark:text-white mt-1">Modern Component Architecture</div>
              <div className="text-[11px] text-amber-500 mt-1">{projectContext.stack.frameworks.join(', ')}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase">Test Runners</span>
              <div className="font-bold text-slate-900 dark:text-white mt-1">Deterministic Suites</div>
              <div className="text-[11px] text-emerald-500 mt-1">{projectContext.stack.testRunners.join(', ')}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase">Browser QA Engine</span>
              <div className="font-bold text-slate-900 dark:text-white mt-1">Headless Chromium</div>
              <div className="text-[11px] text-emerald-500 mt-1">{projectContext.stack.browserQA}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase">Package Manager</span>
              <div className="font-bold text-slate-900 dark:text-white mt-1">{projectContext.stack.packageManager}</div>
              <div className="text-[11px] text-slate-400 mt-1">Strict node_modules layout</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase">Target Scope</span>
              <div className="font-bold text-slate-900 dark:text-white mt-1">Monorepo / Full-Stack</div>
              <div className="text-[11px] text-slate-400 mt-1">Parallel unit testing batch</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GIT STATE & AUTONOMY GUARD */}
      {activeTab === 'git' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Safe Autonomy & Git Guard Status
                </h3>
                <p className="text-xs text-slate-500">
                  Enforces that AI agents never commit, push, or open pull requests automatically.
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-mono text-xs font-bold border border-emerald-500/20">
              GUARD ACTIVE
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs font-mono">
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span className="text-slate-500">Repository Root:</span>
              <span>{projectContext.repository}</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span className="text-slate-500">Current Branch:</span>
              <span className="text-amber-500">{projectContext.branch}</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span className="text-slate-500">Working Tree State:</span>
              <span className="text-emerald-500">Uncommitted diffs held safely for review</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span className="text-slate-500">Bypass Permitted:</span>
              <span className="text-rose-500 font-bold">NO (Hard Hook Barrier)</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
