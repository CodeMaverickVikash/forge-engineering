import React from 'react';
import { 
  Cpu, 
  GitBranch, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Terminal, 
  Workflow,
  CheckCircle2,
  Box
} from 'lucide-react';

export const IntegrationsSection: React.FC = () => {
  return (
    <section id="integrations" className="py-24 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0D12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Host Contract & Pipeline
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How Forge Integrates with AI Engines
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Forge acts as the intelligent orchestration layer between developers and underlying execution runtimes — providing structured planning, multi-agent coordination, and verification.
          </p>
        </div>

        {/* Execution Pipeline Architecture Visualizer */}
        <div className="p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111620] shadow-xl mb-12">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            
            {/* Step 1: User */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mx-auto flex items-center justify-center font-bold mb-2">
                <Terminal className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Developer</div>
              <div className="text-[10px] font-mono text-amber-500 mt-0.5">/forge &lt;request&gt;</div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center text-slate-400">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Step 2: Forge Core */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center shadow-sm ring-1 ring-amber-500/20">
              <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 mx-auto flex items-center justify-center font-bold mb-2 shadow-md shadow-amber-500/30">
                <Workflow className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">FORGE Engine</div>
              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">Plan • Route • Guard</div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center text-slate-400">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Step 3: Execution Platforms */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 mx-auto flex items-center justify-center font-bold mb-2">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">AI Host Runtime</div>
              <div className="text-[10px] font-mono text-purple-500 mt-0.5">Claude Code / Antigravity</div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center text-slate-400">
              <ArrowRight className="w-5 h-5" />
            </div>

            {/* Step 4: Verification & Delivery */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 text-slate-950 mx-auto flex items-center justify-center font-bold mb-2 shadow-md shadow-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Verified Delivery</div>
              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">G1–G15 + Evidence</div>
            </div>

          </div>
        </div>

        {/* Two Host Support Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Claude Code */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111620] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center justify-center">
                  CC
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Claude Code Plugin Layout
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Verified Native
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Full native subagent support via <code className="text-amber-500">Agent</code> tool. Tool allow-lists strictly enforced at process boundary, git-guard hook blocks destructive commands automatically, and Sonnet/Opus model escalation runs on Claude Code sessions.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between">
              <span>Install target: ~/.claude/skills</span>
              <span className="text-amber-500">marketplace.json</span>
            </div>
          </div>

          {/* Google Antigravity */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111620] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center">
                  AG
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Google Antigravity Runtime
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Verified Native
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Full native subagent support via <code className="text-amber-500">invoke_subagent</code>. Configures <code className="text-amber-500">disable-slash-command</code> to prevent command clutter, maps model tiers cleanly to <code className="text-amber-500">inherit</code>, and provides sequential Mode B fallback for non-agent surfaces.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between">
              <span>Install target: ~/.gemini/config/</span>
              <span className="text-blue-500">skills + agents</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
