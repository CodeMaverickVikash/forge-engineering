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
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-1">
            <Settings className="w-4 h-4" />
            <span>PLATFORM CONFIGURATION & SECURITY POLICY</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Settings & Safe Autonomy Policy
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure host platform bindings, model escalation policies, and MCP connections.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 self-start"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : null}
          <span>{saved ? 'Settings Saved' : 'Save Configuration'}</span>
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
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Strict Git-Guard Autonomy Barrier
              </h3>
              <p className="text-xs text-slate-500">
                Guarantees zero unapproved git commit, push, merge, or PR creation commands.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            LOCKED (ENFORCED)
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The FORGE git guard hook is permanently active during all <code className="text-amber-500">/forge</code> turns. It intercepts attempts to modify remote history or create unapproved commits. All work is preserved in the working tree for explicit human review.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>git commit / git push / git merge / git rebase: BLOCKED</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>gh pr create / release publish: BLOCKED</span>
          </div>
        </div>
      </div>

      {/* Card 2: Model Routing & Escalation Policies */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Intelligent Model Escalation Policy
              </h3>
              <p className="text-xs text-slate-500">
                Dynamically escalates code review and security audits to the strongest model.
              </p>
            </div>
          </div>

          <button
            onClick={() => setModelEscalation(!modelEscalation)}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition-colors ${
              modelEscalation ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {modelEscalation ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          When changes touch auth, payments, database migrations, or cryptographic functions, Forge automatically moves independent code review and threat analysis to the Opus model tier.
        </p>
      </div>

      {/* Card 3: Connected MCP Servers */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Browser QA & MCP Tool Integrations
              </h3>
              <p className="text-xs text-slate-500">
                Connected Model Context Protocol servers for browser journeys and DevTools inspection.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            2 Connected
          </span>
        </div>

        <div className="space-y-2">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">chrome-devtools-mcp</div>
              <div className="text-[11px] text-slate-400">npx -y chrome-devtools-mcp@latest --redactNetworkHeaders</div>
            </div>
            <span className="text-emerald-500 font-bold">ACTIVE</span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">@playwright/mcp</div>
              <div className="text-[11px] text-slate-400">npx @playwright/mcp@latest</div>
            </div>
            <span className="text-emerald-500 font-bold">ACTIVE</span>
          </div>
        </div>
      </div>

    </div>
  );
};
