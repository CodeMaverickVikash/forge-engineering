import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Cpu, 
  Lock, 
  Globe, 
  Terminal, 
  Check, 
  AlertCircle,
  ToggleRight,
  Flame,
  CheckCircle2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [modelEscalation, setModelEscalation] = useState(true);
  const [browserMcp, setBrowserMcp] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 mb-1">
            <Settings className="w-4 h-4" />
            <span>PLATFORM CONFIGURATION & SECURITY POLICY</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Settings & Safe Autonomy Policy
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Configure host platform bindings, model escalation policies, and MCP connections.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : null}
          <span role="status" aria-live="polite">{saved ? 'Settings Saved' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Card 1: Safe Autonomy & Non-Negotiable Git Guard */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Safe Autonomy & Git Guard Enforcement
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Non-negotiable rule 4: AI agents never commit, push, or rebase git repositories.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            ENFORCED
          </span>
        </div>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono space-y-1">
            <div className="text-slate-500"># Intercepted & Blocked Commands:</div>
            <div className="text-rose-500 font-semibold">✗ git commit -m "..."</div>
            <div className="text-rose-500 font-semibold">✗ git push origin &lt;branch&gt;</div>
            <div className="text-rose-500 font-semibold">✗ git reset --hard / git stash</div>
            <div className="text-rose-500 font-semibold">✗ gh pr create</div>
          </div>
          <p className="leading-relaxed">
            All code modifications are written to your local working tree. The final engineering record provides complete line-by-line diffs for developer review and manual commit.
          </p>
        </div>
      </div>

      {/* Card 2: Model Escalation Policy */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Intelligent Model Escalation
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Automatically escalate to Opus / strong model tier on auth, payment, and database schema files.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={modelEscalation}
            aria-label="Intelligent model escalation policy"
            onClick={() => setModelEscalation(!modelEscalation)}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors ${
              modelEscalation ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {modelEscalation ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Standard tasks execute with fast, cost-efficient Sonnet models. When validation-gate.mjs flags sensitive security or cryptographic areas, FORGE triggers an automatic model escalation to Claude Opus.
        </p>
      </div>

      {/* Card 3: MCP & Browser QA Runtime */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Browser QA & Chrome DevTools MCP
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Playwright journey execution and runtime console/network audit integration.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={browserMcp}
            aria-label="Browser QA MCP connection"
            onClick={() => setBrowserMcp(!browserMcp)}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors ${
              browserMcp ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {browserMcp ? 'CONNECTED' : 'DISCONNECTED'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-[11px] space-y-1">
            <span className="text-slate-500">Playwright MCP Server:</span>
            <div className="text-emerald-500 font-bold">● Active (stdio transport)</div>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-[11px] space-y-1">
            <span className="text-slate-500">Chrome DevTools MCP:</span>
            <div className="text-emerald-500 font-bold">● Active (stdio transport)</div>
          </div>
        </div>
      </div>

    </div>
  );
};
