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
    if (!text.trim()) return { size: 'M', label: 'Feature', risk: 'Standard' };
    if (lower.startsWith('how') || lower.startsWith('where') || lower.startsWith('explain') || lower.includes('?')) {
      return { size: 'Q', label: 'Question', risk: 'Read-only (No code edits)' };
    }
    if (lower.includes('auth') || lower.includes('jwt') || lower.includes('payment') || lower.includes('stripe') || lower.includes('migration') || lower.includes('schema')) {
      return { size: 'L', label: 'Subsystem / Sensitive', risk: 'High Security (Opus Escalation)' };
    }
    if (lower.includes('fix') || lower.includes('typo') || lower.includes('tweak') || lower.includes('bug')) {
      return { size: 'S', label: 'Defect Fix', risk: 'Low Risk' };
    }
    return { size: 'M', label: 'Feature', risk: 'Standard Risk' };
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
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-1">
          <Terminal className="w-4 h-4" />
          <span>PHASE 1: TASK UNDERSTANDING & SPECIFICATION</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Forge Task Intake Console
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enter what you want built, fixed, or analyzed. Forge analyzes your codebase, generates a specification, and coordinates the minimal specialist team.
        </p>
      </div>

      {/* Main Terminal Input Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] shadow-xl overflow-hidden">
        
        {/* Terminal Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-xs font-mono text-slate-500 ml-2">
              forge-cli: /forge &lt;request&gt;
            </span>
          </div>

          <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Git Guard Enforced</span>
          </span>
        </div>

        {/* Text Area */}
        <div className="p-5 space-y-4">
          <div className="relative">
            <span className="absolute top-3 left-4 text-amber-500 font-mono text-base font-bold select-none">
              /forge
            </span>
            <textarea
              rows={4}
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Build a real-time notification badge with dropdown menu and sound toggle..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-20 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-mono resize-none"
            />
          </div>

          {/* Real-time Task Sizing & Risk Analysis Badge */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">Classified Size</span>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                Size {currentEstimation.size} ({currentEstimation.label})
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Risk Tier & Model</span>
              <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {currentEstimation.risk}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Specialist Wave</span>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                {currentEstimation.size === 'Q' ? 'Direct Orchestrator' : 'Parallel Disjoint Specialists'}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              Changes remain uncommitted in your local working tree for review.
            </span>
            <button
              type="submit"
              disabled={!requestText.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Dispatch Orchestration</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </form>

      {/* Suggested Template Prompts */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          Or Select From Verified Grounded Examples:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((tpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setRequestText(tpl.text)}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] hover:border-amber-500/40 text-left transition-colors space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
                  {tpl.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {tpl.text}
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
