import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  ShieldCheck, 
  Check, 
  Flame,
  HelpCircle,
  Copy
} from 'lucide-react';

export const CTAAndFAQSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedInstall, setCopiedInstall] = useState(false);

  const installCommand = 'git clone https://github.com/forge-eng/forge.git && ./forge/scripts/install.sh';

  const faqs = [
    {
      q: 'How does Forge differ from calling Claude Code or Antigravity directly?',
      a: 'Calling coding agents directly often leads to uncoordinated edits, context amnesia, and silent syntax or regression breaks. Forge sits as an autonomous orchestration layer: it explores your repository with deterministic tools, structures a verified spec and plan, runs specialized subagents with disjoint file ownership, checks 15 quality gates before browser testing, and never commits code without your permission.'
    },
    {
      q: 'Will Forge commit or push code to my Git repository?',
      a: 'Never. Forge operates under a strict, non-negotiable safe autonomy policy. A git guard intercepts and blocks git commit, git push, git merge, git reset --hard, and GitHub PR creation commands. All code changes remain uncommitted in your local working tree for your human inspection and sign-off.'
    },
    {
      q: 'How does Browser QA work without human interaction?',
      a: 'Forge uses Playwright journeys combined with the Chrome DevTools MCP server. Before starting browser tests, Forge requires the Pre-Browser Gate to be OPEN (all static checks, type checks, linting, and unit tests must pass with exit code 0). Then forge-browser-qa navigates real Chromium instances, clicks elements, captures screenshots into .forge/tasks/<slug>/evidence/, and verifies zero uncaught console exceptions or failed network calls.'
    },
    {
      q: 'What happens if a quality check or unit test fails during implementation?',
      a: 'Forge initiates an intelligent root-cause fix loop (Phase 8). It pinpoints the exact file owner (e.g. backend vs frontend) and performs targeted remediation (up to 3 cycles). It then runs a delta retest only on the touched components to conserve execution budget.'
    },
    {
      q: 'Can I use Forge in both Claude Code and Google Antigravity?',
      a: 'Yes. Forge provides unified shared engineering core instructions with host-specific adapters. It installs via scripts/install.sh (macOS/Linux) or scripts/install.ps1 (Windows), detecting your installed AI execution environments automatically.'
    }
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  return (
    <section className="py-24 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0D12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Conversion CTA Card */}
        <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-50 dark:via-[#111620] to-white dark:to-[#0A0D12] p-8 sm:p-14 text-center overflow-hidden shadow-2xl mb-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-amber-500/15 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-3xl mx-auto relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>PRODUCTION-READY ORCHESTRATION</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Spend Less Time Managing AI.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600">
                More Time Building Software.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Experience the clarity of autonomous software engineering behind one command. Turn complex tasks into finished, verified work with zero unapproved commits.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setCurrentView('app-dashboard')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
              >
                <span>Start Building with Forge</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setCurrentView('app-intake')}
                className="w-full sm:w-auto px-6 py-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Terminal className="w-4 h-4 text-amber-500" />
                <span>Try Command Intake</span>
              </button>
            </div>

            {/* Quick Terminal Snippet */}
            <div className="pt-6 max-w-xl mx-auto">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs text-slate-300 shadow-inner">
                <span className="truncate pr-3 text-slate-400">
                  <span className="text-amber-500">$</span> {installCommand}
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px] shrink-0 flex items-center gap-1 transition-colors"
                  title="Copy command"
                >
                  {copiedInstall ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedInstall ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> MIT Open Core</span>
              <span>•</span>
              <span>Claude Code Native</span>
              <span>•</span>
              <span>Google Antigravity Native</span>
            </div>
          </div>
        </div>

        {/* Developer FAQs */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Real architectural answers grounded in the FORGE implementation.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111620] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-slate-900 dark:text-white hover:text-amber-500 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
