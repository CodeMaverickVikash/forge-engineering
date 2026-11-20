import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Terminal, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Cpu, 
  FileCode, 
  Globe, 
  Search, 
  Activity, 
  Flame,
  ChevronRight,
  Sparkles,
  GitCommit,
  Check,
  AlertCircle
} from 'lucide-react';

interface Step {
  id: number;
  label: string;
  badge: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Task Intake', badge: '/forge command' },
  { id: 2, label: 'Context Analysis', badge: 'detect-stack' },
  { id: 3, label: 'Specification & Plan', badge: 'Disjoint files' },
  { id: 4, label: 'Agent Dispatch', badge: 'Parallel specialists' },
  { id: 5, label: 'Code Implementation', badge: 'Diff inspection' },
  { id: 6, label: 'Gates & Browser QA', badge: 'G1–G15 + DevTools' },
  { id: 7, label: 'Verified Delivery', badge: '0 commits created' },
];

export const HeroSection: React.FC = () => {
  const { setCurrentView, createNewTask } = useApp();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return true;
  });
  const [heroPromptInput, setHeroPromptInput] = useState<string>('Build real-time notification badge with dropdown menu and sound toggle');

  // Auto-advance sequence when playing
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev >= 7 ? 1 : prev + 1));
    }, 4500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleLaunchFromHero = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroPromptInput.trim()) return;
    createNewTask(heroPromptInput.trim());
  };

  return (
    <section className="relative pt-12 pb-24 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold shadow-sm hover:border-amber-500/50 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>FORGE v1.2: One-command engineering for Claude Code & Antigravity</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>

        {/* Main Hero Headline & Copy */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            From Idea to Production.<br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 dark:from-amber-400 dark:via-amber-300 dark:to-amber-500">
              One Intelligent Engineering Workflow.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed mb-8">
            Forge orchestrates AI coding agents, manages execution and verifies results — turning complex software tasks into streamlined, verified engineering workflows.
          </p>

          {/* Primary & Secondary Call To Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setCurrentView('app-dashboard')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>How It Works</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Try Command Bar */}
          <form onSubmit={handleLaunchFromHero} className="max-w-2xl mx-auto">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#111620] border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-amber-500 pl-3">/forge</span>
              <input
                type="text"
                aria-label="Forge task prompt"
                value={heroPromptInput}
                onChange={(e) => setHeroPromptInput(e.target.value)}
                placeholder="Enter an engineering task..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* ================= INTERACTIVE WORKFLOW STEP SIMULATOR ================= */}
        <div id="product-demo" className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-2xl overflow-hidden">
            
            {/* Top window bar with Play/Pause & Reset */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A0D12] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  Interactive Forge Lifecycle Simulator
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  aria-label={isPlaying ? 'Pause demo playback' : 'Play demo playback'}
                >
                  {isPlaying ? <Pause className="w-3 h-3 text-amber-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  title="Restart Demonstration"
                  aria-label="Restart demonstration"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="sr-only">Restart demonstration</span>
                </button>
              </div>
            </div>

            {/* Stepper Tabs Bar (Steps 1 to 7) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0A0D12]/50 text-xs font-mono" role="tablist" aria-label="Demo steps">
              {STEPS.map((step) => {
                const isActive = activeStep === step.id;
                const isPassed = activeStep > step.id;
                return (
                  <button
                    key={step.id}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    aria-label={`Step ${step.id}: ${step.label}`}
                    onClick={() => {
                      setActiveStep(step.id);
                      setIsPlaying(false);
                    }}
                    className={`p-3 text-left transition-colors relative border-r border-b sm:border-b-0 border-slate-200 dark:border-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isActive
                        ? 'bg-white dark:bg-[#111620] text-amber-700 dark:text-amber-400 font-bold'
                        : isPassed
                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-white/40'
                        : 'text-slate-500 hover:bg-white/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold">0{step.id}</span>
                      {isPassed && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <div className="text-[11px] truncate font-semibold">{step.label}</div>
                    
                    {/* Active Step Indicator Line & Auto-advance Progress */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500">
                        {isPlaying && (
                          <div className="h-full bg-amber-400 animate-pulse w-full"></div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Step Simulator Content Panels */}
            <div className="p-6 sm:p-8 min-h-[360px] flex flex-col justify-between">
              
              {/* Step 1: Intake */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
                      STEP 1: NATURAL LANGUAGE INTAKE
                    </span>
                    <span className="text-xs font-mono text-slate-500">Size: M (Feature)</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Understand Requirements and Estimate Risk
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800">
                    <span className="text-amber-500">$</span> /forge Build real-time notification badge with dropdown menu and sound toggle
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Forge parses the request, identifies domain requirements, assesses security triggers (e.g. auth, payments, database), and chooses the minimal specialist team.
                  </p>
                </div>
              )}

              {/* Step 2: Context Analysis */}
              {activeStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
                      STEP 2: EVIDENCE-BASED DISCOVERY
                    </span>
                    <span className="text-xs font-mono text-emerald-500 font-bold">116 Signatures Verified</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Explore Codebase with Deterministic Stack Detection
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 space-y-1">
                    <div className="text-slate-500"># Executing detect-stack.mjs into .forge/context.json</div>
                    <div>✔ Languages: TypeScript ^5.7, React ^19.0, Tailwind CSS</div>
                    <div>✔ Testing: Vitest (Unit) + Playwright (Browser QA)</div>
                    <div>✔ Conventions: Disjoint module ownership enforced</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Zero guesswork. The stack detector scans manifests, package managers, and lockfiles to eliminate repetitive context questions.
                  </p>
                </div>
              )}

              {/* Step 3: Spec & Plan */}
              {activeStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
                      STEP 3: GROUNDED SPECIFICATION
                    </span>
                    <span className="text-xs font-mono text-slate-500">spec.md + plan.md</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Frozen Contracts & Strict Disjoint File Ownership
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                      <div className="font-bold text-slate-900 dark:text-white">spec.md</div>
                      <div className="text-slate-500 mt-1">Single source of truth with testable acceptance criteria (Given/When/Then).</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                      <div className="font-bold text-slate-900 dark:text-white">plan.md</div>
                      <div className="text-slate-500 mt-1">Defines disjoint file assignments so parallel agents never collide.</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    By freezing shared contracts before parallel implementation begins, agents build against verified specifications rather than hallucinations.
                  </p>
                </div>
              )}

              {/* Step 4: Dispatch */}
              {activeStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
                      STEP 4: SPECIALIST SUBAGENTS
                    </span>
                    <span className="text-xs font-mono text-emerald-500 font-bold">Parallel Execution</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Launch Targeted Native Specialist Agents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
                      <div className="font-bold text-amber-700 dark:text-amber-400 font-mono">forge-architect</div>
                      <div className="text-slate-500 text-[11px]">Freezes state & API contract</div>
                    </div>
                    <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
                      <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">forge-frontend-engineer</div>
                      <div className="text-slate-500 text-[11px]">Builds NotificationBell.tsx</div>
                    </div>
                    <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1">
                      <div className="font-bold text-purple-600 dark:text-purple-400 font-mono">forge-browser-qa</div>
                      <div className="text-slate-500 text-[11px]">Playwright & DevTools MCP</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    The routing matrix selects only the specialists required for the task. Every agent has calibrated turn budgets and least-privilege tool allow-lists.
                  </p>
                </div>
              )}

              {/* Step 5: Implementation */}
              {activeStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
                      STEP 5: SAFE IMPLEMENTATION
                    </span>
                    <span className="text-xs font-mono text-slate-500">Working Tree Diffs</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Minimal, Production-Quality Code Changes
                  </h3>
                  <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 space-y-1">
                    <div className="text-emerald-400">+ export function NotificationBell() &#123;</div>
                    <div className="text-emerald-400">+   const &#123; unreadCount, toggleSound &#125; = useNotifications();</div>
                    <div className="text-emerald-400">+   return &lt;button aria-label="notifications"&gt;&lt;Bell /&gt;&lt;/button&gt;;</div>
                    <div className="text-emerald-400">+ &#125;</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Changes are written directly to your local files with zero unapproved commits. Diffs are inspectable at any time.
                  </p>
                </div>
              )}

              {/* Step 6: Gates & QA */}
              {activeStep === 6 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
                      STEP 6: HONEST VERIFICATION
                    </span>
                    <span className="text-xs font-mono text-emerald-500 font-bold">G1–G15 Gating</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    G1–G15 Quality Gates & Pre-Browser Gate Enforcement
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      ✔ G1 Syntax Pass
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      ✔ G2 Type Safety
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      ✔ G4 Unit Tests (42)
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      ✔ G9 Pre-Browser OPEN
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Browser QA begins only when G1–G8 pass with exit code 0. Playwright verifies real DOM journeys and Chrome DevTools audits for zero console errors.
                  </p>
                </div>
              )}

              {/* Step 7: Delivery */}
              {activeStep === 7 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-emerald-500 font-bold">
                      STEP 7: VERIFIED DELIVERY RECORD
                    </span>
                    <span className="text-xs font-mono text-emerald-500 font-bold">Status: VERIFIED</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    13-Section Engineering Report Saved with Evidence
                  </h3>
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 text-xs">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Task Completed: 15/15 Quality Gates Passed</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Report persisted to <code className="font-mono text-slate-800 dark:text-slate-200 font-bold">.forge/tasks/live-notification-center/report.md</code>. All files remain safely uncommitted in your working tree for your final code review and commit.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setCurrentView('app-report')}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-md shadow-amber-500/20"
                    >
                      <span>View 13-Section Engineering Report</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentView('app-live')}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      Open In Live Execution Console
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom status bar of the demo */}
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-4">
                <span>Working Directory: <strong className="font-mono text-slate-700 dark:text-slate-300">skills-agent/web/</strong></span>
                <span className="hidden sm:inline">Pre-Browser Gate: <strong className="text-emerald-500">OPEN (exit 0)</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-emerald-500 font-semibold">Git Guard Active</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
