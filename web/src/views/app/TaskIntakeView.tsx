import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Terminal, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  FileCode,
  Zap
} from 'lucide-react';

export const TaskIntakeView: React.FC = () => {
  const { createNewTask } = useApp();
  const [requestText, setRequestText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Sample prompt templates from real Forge cases
  const templates = [
    { label: 'Feature (Size M)', text: 'Build real-time notification badge with dropdown menu and sound toggle' },
    { label: 'Bug Fix (Size S)', text: 'Fix payment retry race condition leading to duplicate webhook charges' },
    { label: 'Architecture / Migration (Size L)', text: 'Migrate legacy HS256 auth to RS256 with key rotation and JWKS endpoint' },
    { label: 'Performance Audit (Size S)', text: 'Profile database bottleneck on user activity dashboard query with EXPLAIN ANALYZE' },
  ];

  // Dynamic sizing estimation based on input
  const estimateSize = (text: string) => {
    const lower = text.toLowerCase();
    if (!text.trim()) return { size: 'M', label: 'Feature', risk: 'Standard Risk', color: 'border-amber-500/30 text-amber-700 dark:text-amber-400' };
    if (lower.startsWith('how') || lower.startsWith('where') || lower.startsWith('explain') || lower.includes('?')) {
      return { size: 'Q', label: 'Question', risk: 'Read-only (No code edits)', color: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' };
    }
    if (lower.includes('auth') || lower.includes('jwt') || lower.includes('payment') || lower.includes('stripe') || lower.includes('migration') || lower.includes('schema')) {
      return { size: 'L', label: 'Subsystem / Sensitive', risk: 'High Security (Opus Escalation)', color: 'border-purple-500/30 text-purple-600 dark:text-purple-400' };
    }
    if (lower.includes('fix') || lower.includes('typo') || lower.includes('tweak') || lower.includes('bug')) {
      return { size: 'S', label: 'Defect Fix', risk: 'Low Risk', color: 'border-blue-500/30 text-blue-600 dark:text-blue-400' };
    }
    return { size: 'M', label: 'Feature', risk: 'Standard Risk', color: 'border-amber-500/30 text-amber-700 dark:text-amber-400' };
  };

  const currentEstimation = estimateSize(requestText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;
    createNewTask(requestText.trim());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 mb-1">
          <Terminal className="w-4 h-4" />
          <span>PHASE 1: TASK UNDERSTANDING & SPECIFICATION</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Autonomous Task Intake Console
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Enter any natural language engineering requirement. Forge explores your codebase with deterministic stack fingerprinting, generates a testable specification, and launches parallel specialist subagents.
        </p>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-sm p-4 sm:p-6 space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-amber-500">/forge</span>
              <span className="text-xs text-slate-400">Command Input</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Git Guard Active</span>
            </div>
          </div>

          <div>
            <label htmlFor="task-intake-textarea" className="sr-only">
              Task intake prompt
            </label>
            <textarea
              id="task-intake-textarea"
              rows={4}
              aria-label="Task intake prompt"
              value={requestText}
              onChange={(e) => {
                setRequestText(e.target.value);
                setSelectedTemplate(null);
              }}
              placeholder="e.g. Add dark mode toggle to the dashboard with localStorage persistence, smooth transition tokens, and automated test coverage..."
              className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-sans transition-all leading-relaxed"
            />
          </div>

          {/* Sizing Estimation Pill (Dynamic Feedback) */}
          <div 
            role="status" 
            aria-live="polite"
            className={`p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors ${currentEstimation.color}`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              <span>Estimated Size: <strong className="font-mono font-bold">Size {currentEstimation.size}</strong> ({currentEstimation.label})</span>
            </div>
            <span className="font-mono text-[11px]">
              Risk Profile: {currentEstimation.risk}
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Press Enter or click Dispatch to initialize orchestration wave
            </span>

            <button
              type="submit"
              disabled={!requestText.trim()}
              className={`px-6 py-3 rounded-xl font-bold text-xs transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                requestText.trim()
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 hover:-translate-y-0.5'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Dispatch Orchestration Wave</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Quick Prompt Templates */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
          Or try a verified engineering prompt template:
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((tpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setRequestText(tpl.text);
                setSelectedTemplate(tpl.label);
              }}
              className={`w-full text-left p-4 rounded-xl border bg-white dark:bg-[#111620] hover:border-amber-500/50 hover:bg-amber-500/5 transition-all space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                selectedTemplate === tpl.label ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-500/10' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  {tpl.label}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {tpl.text}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Safe Autonomy Guarantee Callout */}
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-900 dark:text-white font-semibold block">
            Safe Autonomy Guarantee: Zero Unapproved Commits
          </strong>
          <p>
            Forge strictly enforces a git guard. No <code className="text-emerald-600 dark:text-emerald-400 font-mono">git commit</code>, <code className="text-emerald-600 dark:text-emerald-400 font-mono">git push</code>, or branch operations will ever be executed without your explicit review. All changes remain uncommitted in your working tree.
          </p>
        </div>
      </div>

    </div>
  );
};
