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
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium shadow-sm hover:border-amber-500/50 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>FORGE v1.2: One-command engineering for Claude Code & Antigravity</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>

        {/* Main Hero Headline & Copy */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            From Idea to Production.<br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600">
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
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
            >
              <Cpu className="w-4 h-4 text-amber-500" />
              <span>See How It Works</span>
            </button>
          </div>

          {/* Inline Live Command Try-out */}
          <form 
            onSubmit={handleLaunchFromHero}
            className="max-w-2xl mx-auto flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-lg shadow-black/5 dark:shadow-black/20 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 pl-3 text-amber-500 font-mono text-sm font-semibold">
              <Terminal className="w-4 h-4" />
              <span>/forge</span>
            </div>
            <input
              type="text"
              value={heroPromptInput}
              onChange={(e) => setHeroPromptInput(e.target.value)}
              placeholder="What do you want built? (e.g., Fix the payment retry race condition)"
              className="flex-1 bg-transparent border-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none px-2"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-400 dark:hover:text-slate-950 font-medium text-xs transition-colors shrink-0 flex items-center gap-1.5"
            >
              <span>Dispatch</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* ---------------- PRODUCT DEMONSTRATION WORKFLOW ---------------- */}
        <div id="product-demo" className="mt-14 max-w-5xl mx-auto">
          
          {/* Demo Controls Bar */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Interactive Engineering Workflow Demonstration
              </span>
            </div>

            {/* Play/Pause & Reset Controls */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isPlaying ? 'Pause Auto-advance' : 'Resume Auto-advance'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                onClick={() => setActiveStep(1)}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Restart Demonstration"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stepper Navigation Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 mb-4">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const isPast = activeStep > step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setActiveStep(step.id);
                    setIsPlaying(false);
                  }}
                  className={`px-2.5 py-2 rounded-lg text-left transition-all border text-xs flex flex-col justify-between ${
                    isActive 
                      ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-amber-500/30' 
                      : isPast
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400'
                      : 'border-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      0{step.id}
                    </span>
                    {isPast && <Check className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <span className="font-semibold truncate text-[11px]">{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Demonstration Interactive Screen Shell */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-2xl overflow-hidden font-sans">
            
            {/* Window title bar */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-2">
                  forge-session: live-notification-center [Size M]
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Step {activeStep} of 7: {STEPS[activeStep - 1].label}
                </span>
              </div>
            </div>

            {/* Dynamic Step Content Area */}
            <div className="p-6 min-h-[380px] flex flex-col justify-center">
              
              {/* STEP 1: TASK INTAKE */}
              {activeStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <Terminal className="w-4 h-4 text-amber-500" />
                    <span>USER ENTRY COMMAND</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-sm border border-slate-800 shadow-inner flex items-center gap-3">
                    <span className="text-amber-400 font-bold">$</span>
                    <span className="text-amber-300">/forge</span>
                    <span className="text-white">Build real-time notification badge with dropdown menu and sound toggle</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                      <div className="text-[11px] text-slate-400">Classified Task Size</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Size M (Feature)</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                      <div className="text-[11px] text-slate-400">Security / Data Risk</div>
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Standard Tier (Low Risk)</div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                      <div className="text-[11px] text-slate-400">Autonomy Guard</div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">Zero Commit Policy Enforced</div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CONTEXT ANALYSIS */}
              {activeStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-amber-500" />
                      <span>EXPLORING CODEBASE WITH DETECT-STACK.MJS</span>
                    </div>
                    <span className="text-emerald-500 font-semibold">116 Signatures Verified</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 font-mono text-xs text-slate-300 space-y-1.5 border border-slate-800">
                    <p className="text-slate-400">[00:00.12] Scanning repository files for stack signatures...</p>
                    <p className="text-emerald-400">✔ Found runtime: Node.js 24.22.1 (ESM) + pnpm 12.15.0</p>
                    <p className="text-emerald-400">✔ Found frontend: React 19 + Tailwind CSS 3.4 + Vite 6.1</p>
                    <p className="text-emerald-400">✔ Found test runner: Vitest 2.1 (42 test suites located)</p>
                    <p className="text-emerald-400">✔ Found browser QA: Playwright 1.49 + Chrome DevTools MCP</p>
                    <p className="text-amber-400">→ Written grounded context to .forge/context.json</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deterministic evidence detection prevents hallucinations and stops agents from guessing the wrong package manager or test framework.
                  </p>
                </div>
              )}

              {/* STEP 3: SPECIFICATION & PLAN */}
              {activeStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-amber-500" />
                      <span>GROUNDED SPECIFICATION & DISJOINT PLAN GENERATION</span>
                    </div>
                    <span className="text-amber-500 font-semibold">spec.md + plan.md</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Acceptance Criteria (Grounded)</span>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                        <li>Real-time counter updates badge on incoming SSE message</li>
                        <li>Dropdown shows recent notifications with 'Mark All Read'</li>
                        <li>Sound toggle persists state in localStorage</li>
                        <li>Accessibility: aria-live="polite" and Esc dismiss</li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>Strict File Ownership Matrix</span>
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                          <span>NotificationBell.tsx</span>
                          <span className="text-amber-500">forge-frontend-engineer</span>
                        </div>
                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                          <span>api/notifications/route.ts</span>
                          <span className="text-amber-500">forge-backend-engineer</span>
                        </div>
                        <div className="flex justify-between text-slate-700 dark:text-slate-300">
                          <span>notifications.test.ts</span>
                          <span className="text-amber-500">forge-test-automation</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: AGENT DISPATCH */}
              {activeStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-amber-500" />
                      <span>PARALLEL SUBAGENT WAVE DISPATCHED</span>
                    </div>
                    <span className="text-emerald-500 font-semibold">4 Native Subagents Active</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
                        FE
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">forge-frontend-engineer</div>
                        <div className="text-[11px] text-slate-500 truncate">Writing UI components & animation states</div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>

                    <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs">
                        BE
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">forge-backend-engineer</div>
                        <div className="text-[11px] text-slate-500 truncate">Implementing SSE stream & auth session verification</div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold text-xs">
                        QA
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">forge-browser-qa</div>
                        <div className="text-[11px] text-slate-500 truncate">Staged: Waiting behind Pre-Browser Gate</div>
                      </div>
                      <span className="text-[10px] text-amber-500 font-mono">GATED</span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
                        CR
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">forge-code-reviewer</div>
                        <div className="text-[11px] text-slate-500 truncate">Staged: Waiting for uncommitted diff batch</div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">STANDBY</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: CODE IMPLEMENTATION */}
              {activeStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-amber-500" />
                      <span>INSPECTING UNCOMMITTED DIFFS (DISJOINT CHANGES)</span>
                    </div>
                    <span className="text-emerald-500 font-mono">+142 / -12 lines</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs overflow-x-auto text-slate-300 border border-slate-800 space-y-0.5">
                    <div className="text-slate-500">--- a/src/components/NotificationBell.tsx</div>
                    <div className="text-slate-500">+++ b/src/components/NotificationBell.tsx</div>
                    <div className="text-slate-400">{"@@ -18,6 +18,18 @@ export function NotificationBell() {"}</div>
                    <div className="text-emerald-400">{"+  const { unreadCount, toggleSound, soundEnabled } = useNotifications();"}</div>
                    <div className="text-emerald-400">{"+  return ("}</div>
                    <div className="text-emerald-400">{"+    <button aria-label=\"unread notifications\" className=\"relative\">"}</div>
                    <div className="text-emerald-400">{"+      <Bell className=\"w-5 h-5 text-slate-200\" />"}</div>
                    <div className="text-emerald-400">{"+      {unreadCount > 0 && ("}</div>
                    <div className="text-emerald-400">{"+        <span className=\"absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full\">"}</div>
                    <div className="text-emerald-400">{"+          {unreadCount}"}</div>
                    <div className="text-emerald-400">{"+        </span>"}</div>
                    <div className="text-emerald-400">{"+      )}"}</div>
                    <div className="text-emerald-400">{"+    </button>"}</div>
                    <div className="text-emerald-400">{"+  );"}</div>
                    <div className="text-slate-400">{"}"}</div>
                  </div>
                </div>
              )}

              {/* STEP 6: GATES & BROWSER QA */}
              {activeStep === 6 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-500" />
                      <span>QUALITY GATES G1–G15 & PLAYWRIGHT + DEVTOOLS MCP</span>
                    </div>
                    <span className="text-emerald-500 font-semibold">Pre-Browser Gate: OPEN</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span>Pre-Browser Gate Suite</span>
                        <span className="text-[10px] text-emerald-500 font-mono">ALL PASSED</span>
                      </div>
                      <div className="space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between"><span>G1 Syntax & Format:</span><span className="text-emerald-500">PASS</span></div>
                        <div className="flex justify-between"><span>G2 TypeScript Check:</span><span className="text-emerald-500">PASS (0 err)</span></div>
                        <div className="flex justify-between"><span>G3 ESLint:</span><span className="text-emerald-500">PASS</span></div>
                        <div className="flex justify-between"><span>G4 Unit & Regr Tests:</span><span className="text-emerald-500">PASS (42/42)</span></div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span>Browser QA (Playwright + MCP)</span>
                        <span className="text-[10px] text-emerald-500 font-mono">VERIFIED</span>
                      </div>
                      <div className="space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between"><span>Playwright Journeys:</span><span className="text-emerald-500">3 Passed</span></div>
                        <div className="flex justify-between"><span>DevTools Console Errors:</span><span className="text-emerald-500">0 Exceptions</span></div>
                        <div className="flex justify-between"><span>Network 4xx/5xx:</span><span className="text-emerald-500">0 Failed</span></div>
                        <div className="flex justify-between"><span>Indexed Evidence:</span><span className="text-amber-500">3 Screenshots</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: VERIFIED DELIVERY */}
              {activeStep === 7 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>COMPLETED TASK & DELIVERY REPORT (SAFE AUTONOMY)</span>
                    </div>
                    <span className="text-emerald-500 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      STATUS: VERIFIED
                    </span>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Task Finished with Comprehensive Evidence
                      </div>
                      <span className="text-xs font-mono text-slate-500">Duration: 3m 28s</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      All 15 quality gates satisfied. 5 files edited cleanly across disjoint boundaries. Independent code review by forge-code-reviewer approved. 
                      <strong className="text-slate-900 dark:text-slate-200 block mt-1">
                        Zero git commits or pull requests were created. Code is ready in your working tree for inspection.
                      </strong>
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                      <button
                        onClick={() => setCurrentView('app-report')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5"
                      >
                        <span>View 13-Section Engineering Report</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCurrentView('app-live')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Open In Live Execution Console
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom status bar of the demo */}
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-4">
                <span>Working Directory: <strong className="font-mono text-slate-700 dark:text-slate-300">acme-app/</strong></span>
                <span className="hidden sm:inline">Pre-Browser Gate: <strong className="text-emerald-500">OPEN (exit 0)</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-emerald-500">Git Guard Active</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
