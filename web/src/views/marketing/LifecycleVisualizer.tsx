import React, { useState } from 'react';
import { FORGE_LIFECYCLE_PHASES } from '../../lib/data';
import { 
  ArrowRight, 
  CheckCircle2, 
  Search, 
  FileText, 
  Compass, 
  Calendar, 
  Code, 
  CheckSquare, 
  Wrench, 
  Eye, 
  FileCheck
} from 'lucide-react';

const PHASE_ICONS = [
  Search,      // 1 Understand
  Compass,     // 2 Explore
  FileText,    // 3 Specify
  Compass,     // 4 Architect
  Calendar,    // 5 Plan
  Code,        // 6 Implement
  CheckSquare, // 7 Verify
  Wrench,      // 8 Fix
  Eye,         // 9 Final Check
  FileCheck    // 10 Report
];

export const LifecycleVisualizer: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<number>(1);

  const phaseDetails = [
    {
      phase: 1,
      name: 'Understand',
      tagline: 'Size estimation and security risk classification',
      inputs: ['Raw user request from /forge command', 'Existing git status & repository health'],
      actions: [
        'Classify task size into Q (Question), S (Small defect), M (Feature), or L (Subsystem)',
        'Check for security triggers: auth, payments, crypto, or database schema changes',
        'Size up task automatically if touching PII, public APIs or multiple deployable units'
      ],
      output: 'Sizing matrix decision (e.g. Size M, Standard risk)'
    },
    {
      phase: 2,
      name: 'Explore',
      tagline: 'Deterministic technology discovery from codebase evidence',
      inputs: ['Root repository files, configs, and lockfiles'],
      actions: [
        'Run fast detect-stack.mjs detector to identify 116 stack signatures',
        'Inspect existing test runners, package manager, and lint scripts',
        'Read and revalidate durable knowledge from .forge/knowledge.md'
      ],
      output: '.forge/context.json containing grounded stack definition'
    },
    {
      phase: 3,
      name: 'Specify',
      tagline: 'Prompt enhancement into a single source of truth',
      inputs: ['.forge/context.json', 'Discovered code modules'],
      actions: [
        'Formulate testable acceptance criteria grounded in existing conventions',
        'Eliminate ambiguity and record architectural assumptions',
        'Author .forge/tasks/<slug>/spec.md'
      ],
      output: 'spec.md (Single source of truth for the entire run)'
    },
    {
      phase: 4,
      name: 'Architect',
      tagline: 'Routing matrix selects the smallest team covering risks',
      inputs: ['spec.md', '26 specialist agent catalog'],
      actions: [
        'Select the minimal viable team of specialists to avoid coordination overhead',
        'Freeze contracts between frontend and backend boundaries',
        'For Size L, forge-architect authors an Architectural Decision Record (ADR)'
      ],
      output: 'Assigned specialist wave and frozen API interface contracts'
    },
    {
      phase: 5,
      name: 'Plan',
      tagline: 'Ordered execution graph with disjoint file ownership',
      inputs: ['spec.md', 'Architecture contract'],
      actions: [
        'Break down implementation into discrete subtasks',
        'Assign strict file ownership to prevent concurrent write collisions',
        'Design validation strategy and define required quality gates'
      ],
      output: 'plan.md with disjoint file ownership guarantees'
    },
    {
      phase: 6,
      name: 'Implement',
      tagline: 'Parallel native specialist subagents on disjoint files',
      inputs: ['plan.md work orders'],
      actions: [
        'Launch specialized subagents (frontend, backend, database) in parallel',
        'Enforce turn caps (maxTurns) to prevent runaway loops',
        'Inspect diffs in real-time to ensure adherence to conventions'
      ],
      output: 'Uncommitted code changes across disjoint file trees'
    },
    {
      phase: 7,
      name: 'Verify',
      tagline: 'Parallel test batch, Pre-browser barrier & Playwright journeys',
      inputs: ['Uncommitted changes in working tree'],
      actions: [
        'Run validation-gate.mjs: parallel typecheck, lint, and unit test suites',
        'Pre-browser gate barrier blocks browser work until tests exit 0',
        'forge-browser-qa executes headless Playwright journeys & Chrome DevTools MCP inspection'
      ],
      output: 'G1–G15 quality gate status report and indexed screenshots'
    },
    {
      phase: 8,
      name: 'Fix',
      tagline: 'Targeted root-cause remediation loop with delta retests',
      inputs: ['Failing gate outputs or DevTools console errors'],
      actions: [
        'Identify exact failing module owner (frontend or backend)',
        'Perform root-cause fix (capped at max 3 remediation cycles)',
        'Run delta retest only on modified components to conserve check budget'
      ],
      output: 'Remediated code diffs and verified passing delta tests'
    },
    {
      phase: 9,
      name: 'Final Check',
      tagline: 'Scope audit and independent review on Opus for sensitive paths',
      inputs: ['Final uncommitted diff', 'spec.md requirements'],
      actions: [
        'forge-code-reviewer conducts adversarial diff audit against spec.md',
        'Automatically escalates reviewer to Opus model on auth/payment changes',
        'Verify zero unrelated files were touched in git diff'
      ],
      output: 'Independent review approval verdict and scope confirmation'
    },
    {
      phase: 10,
      name: 'Report',
      tagline: 'Delivered software with evidence & zero unapproved git commits',
      inputs: ['All gate results, test logs, screenshots, and diffs'],
      actions: [
        'Stop background dev servers cleanly to free ports',
        'Fill 13-section report into .forge/tasks/<slug>/report.md',
        'Deliver answer to user with clear completion status: VERIFIED'
      ],
      output: 'Finished engineering work left in working tree for review'
    }
  ];

  const currentDetail = phaseDetails[selectedPhase - 1];
  const CurrentIcon = PHASE_ICONS[selectedPhase - 1];

  return (
    <section id="how-it-works" className="py-24 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0D12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Intelligent Orchestration
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            The 10-Phase Engineering Lifecycle
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Every task flows through an adaptive, deterministic lifecycle. No missed edge cases, no hallucinated passes, and no unapproved git operations.
          </p>
        </div>

        {/* 10-Step Interactive Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {FORGE_LIFECYCLE_PHASES.map((p) => {
            const isSelected = selectedPhase === p.phase;
            const Icon = PHASE_ICONS[p.phase - 1];
            return (
              <button
                key={p.phase}
                onClick={() => setSelectedPhase(p.phase)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-sm ring-1 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {p.phase}
                </span>
                <Icon className="w-3.5 h-3.5" />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Phase Deep-Dive Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111620] p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg">
                <CurrentIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Phase {currentDetail.phase}
                  </span>
                  <span className="text-slate-400">•</span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {currentDetail.name}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {currentDetail.tagline}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                Phase {selectedPhase} of 10
              </span>
              <button
                onClick={() => setSelectedPhase((prev) => (prev >= 10 ? 1 : prev + 1))}
                className="px-3 py-1 rounded-md bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 flex items-center gap-1 transition-colors"
              >
                <span>Next Phase</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Grid of inputs, actions, deliverables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Inputs */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Phase Inputs</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                {currentDetail.inputs.map((inp, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{inp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Actions */}
            <div className="space-y-3 lg:col-span-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Orchestrated Actions</span>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                {currentDetail.actions.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guaranteed Output */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Phase Deliverable</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Evidence-Backed Output:
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                  {currentDetail.output}
                </div>
                <p className="text-[11px] text-slate-500">
                  No subsequent phase initiates until this deliverable satisfies all gate criteria.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
