import React, { useState } from 'react';
import { 
  Minimize2, 
  Eye, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  ArrowRight,
  Terminal,
  Cpu,
  Lock,
  GitPullRequest
} from 'lucide-react';

export const KeyBenefitsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const benefits = [
    {
      id: 0,
      title: 'Less Context Switching',
      subtitle: 'Keep project understanding, planning, and execution in one seamless stream',
      icon: Minimize2,
      headline: 'Stop copy-pasting code snippets across five browser tabs',
      description: 'Forge executes within your actual environment. It reads the local file tree, discovers dependencies automatically, executes commands, and checks git diffs natively — you never leave your editor or terminal workflow.',
      facts: [
        'Deterministic stack detector replaces 30+ manual configuration questions',
        'Single /forge entry command handles questions, bug fixes, features, and full audits',
        'All task specs, implementation plans, and reports are persisted directly in .forge/'
      ],
      codeSnippet: `// One single terminal command starts the entire engineering wave\n$ /forge Fix duplicate charges during Stripe webhook retries\n\n✔ Classified as Size M (Feature/Fix)\n✔ Stack detected: Next.js 15, Prisma 6, Redis 7, Vitest\n✔ Work orders generated for integration & database specialists`
    },
    {
      id: 1,
      title: 'More Engineering Visibility',
      subtitle: 'Know exactly what agents are doing, why, and which files they touch',
      icon: Eye,
      headline: 'Complete transparency through 3 progressive levels of disclosure',
      description: 'No opaque black-box "thinking" indicators. Forge gives you high-level phase progress, real-time agent handoff events, and full terminal/tool output with stack traces.',
      facts: [
        'Level 1: High-level phase status, active specialists, and time metrics',
        'Level 2: Real-time agent event stream and file ownership assignments',
        'Level 3: Exact tool calls, bash commands, raw diffs, and DevTools traces'
      ],
      codeSnippet: `[11:03:15] [forge-integration-engineer] Locking Redis key: idemp:evt_3N8x...\n[11:03:22] [forge-database-engineer] Running migration: 20261120_idemp_idx\n[11:03:40] [forge-security-engineer] Validated Stripe signature verification header\n[11:04:12] [Pre-Browser Gate] All 4 unit test suites passed (Exit code 0)`
    },
    {
      id: 2,
      title: 'Controlled Automation',
      subtitle: 'Review important actions and maintain strict control over execution',
      icon: ShieldCheck,
      headline: 'Non-negotiable git guard: Zero unapproved commits or pushes',
      description: 'AI agents should write code, not decide when your repository gets modified. Forge enforces an un-bypassable git guard: all changes remain uncommitted in your local working tree for your human sign-off.',
      facts: [
        'Enforced git-guard blocks "git commit", "git push", and "gh pr create"',
        'Requires explicit human confirmation for any external API or skill install',
        'Full pause, resume, reject, and inspect controls at every verification gate'
      ],
      codeSnippet: `// Forge Git Guard Autonomy Enforcement\n$ git commit -m "feat: notification bell"\n[FORGE GUARD BLOCKED]: Uncommitted autonomy policy in effect.\nEvery change is left in the working tree for developer review.\nTo commit manually: inspect 'git diff' then run git commit yourself.`
    },
    {
      id: 3,
      title: 'Durable Project Memory',
      subtitle: 'Maintain useful project context across engineering sessions',
      icon: Database,
      headline: 'Code is the truth. Revalidated knowledge that never goes stale',
      description: 'Unlike ephemeral LLM chat threads that forget project rules after a few turns, Forge maintains .forge/knowledge.md. It stores durable architecture rules, testing patterns, and file boundaries with verified line references.',
      facts: [
        'Persistent .forge/knowledge.md with verified conventions',
        'Automatic staleness detection and revalidation on every run',
        'Never stores secrets, tokens, or sensitive .env data'
      ],
      codeSnippet: `// .forge/knowledge.md (Extracted & Revalidated)\n## Durable Architecture Conventions\n- Disjoint File Ownership: parallel engineers never touch the same file\n- Pre-browser gate: G1-G8 must pass before Playwright runs\n- Model escalation: Opus model mandated for auth & payment files`
    },
    {
      id: 4,
      title: 'Verified Delivery',
      subtitle: 'See actual validation results and implementation evidence',
      icon: CheckCircle2,
      headline: 'Honest verification: Never fakes a test pass or hides an error',
      description: 'A missing tool is never reported as passed. Forge reports every gate with explicit evidence: PASSED, FAILED, PRE-EXISTING, or BLOCKED. If Playwright is not connected, the verdict is clearly stated as "implemented, not browser-verified".',
      facts: [
        '15 strict Quality Gates (G1–G15) checked before completion',
        'Real Playwright journeys + Chrome DevTools console & network audits',
        'Indexed screenshot evidence saved directly to .forge/tasks/<slug>/evidence/'
      ],
      codeSnippet: `### FORGE Execution Report\n- Status: VERIFIED\n- Static checks: G1 PASS, G2 PASS (0 type errors), G3 PASS (0 lint warnings)\n- Unit tests: 42 passed in 4.6s\n- Browser QA: 3 Playwright journeys verified (0 console errors, 0 failed 5xx)\n- Evidence: .forge/tasks/live-notification-center/evidence/journey-01.png`
    }
  ];

  const current = benefits[activeTab];
  const CurrentIcon = current.icon;

  return (
    <section className="py-24 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0A0D12]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
            Core Value Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Engineered for High-Trust Autonomy
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Forge replaces the chaos of fragmented, copy-pasting AI coding with a systematic software engineering organization behind one terminal command.
          </p>
        </div>

        {/* 5 Benefits Interactive Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10" role="tablist" aria-label="Core benefits">
          {benefits.map((b) => {
            const isSelected = activeTab === b.id;
            const Icon = b.icon;
            return (
              <button
                key={b.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                aria-label={`Pillar ${b.id + 1}: ${b.title}`}
                onClick={() => setActiveTab(b.id)}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  isSelected
                    ? 'border-amber-500 bg-white dark:bg-[#111620] shadow-md ring-1 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">0{b.id + 1}</span>
                </div>
                <div>
                  <span className={`block text-xs font-bold leading-snug ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {b.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Benefit Detail Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-8 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                <CurrentIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>Pillar 0{current.id + 1}: {current.title}</span>
              </div>
              
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {current.headline}
              </h3>
              
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-2.5 pt-2">
                {current.facts.map((fact, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Code Box */}
            <div className="lg:col-span-5">
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl font-mono text-xs">
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">evidence-preview.log</span>
                </div>
                <div className="p-4 text-slate-300 whitespace-pre-line leading-relaxed overflow-x-auto text-[11px]">
                  {current.codeSnippet}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
