import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SAMPLE_REVIEW_SECTIONS } from '../../lib/data';
import { 
  FileCheck2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  GitBranch, 
  ChevronRight,
  FileText
} from 'lucide-react';

export const DeliveryReportView: React.FC = () => {
  const { selectedTask } = useApp();
  const [copied, setCopied] = useState<boolean>(false);

  const fullReportMarkdown = `### FORGE Execution Report

**Task:** ${selectedTask.slug}
**Status:** ${selectedTask.status}
**Request:** ${selectedTask.request}
**Files Changed:** ${selectedTask.filesChanged} (Disjoint boundaries checked)
**Quality Gates:** ${selectedTask.gatesPassed}/${selectedTask.totalGates} PASSED
**Git Guard:** Enforced (0 commits, 0 pushes created)

${SAMPLE_REVIEW_SECTIONS.map((sec) => `#### ${sec.number}. ${sec.title}\n${sec.content}`).join('\n\n')}

No commit, push, or pull request was created. All changes remain uncommitted in the working tree for review.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullReportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>PHASE 10: DELIVERED ENGINEERING RECORD</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            13-Section Engineering Delivery Report
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Saved to <code className="text-amber-500 font-mono">.forge/tasks/{selectedTask.slug}/report.md</code> with indexed evidence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
          </button>
        </div>
      </div>

      {/* Top Completion Status Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              STATUS: {selectedTask.status}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Duration: 3m 28s</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Verified Engineering Work Delivered
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {selectedTask.summary}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shrink-0">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Commits Created</span>
        </div>
      </div>

      {/* 13-Section Structured Document */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
            Grounded Engineering Review
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            ### FORGE Execution Report
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 space-y-6">
          {SAMPLE_REVIEW_SECTIONS.map((sec) => (
            <div key={sec.number} className="pt-6 first:pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-mono">
                  <span className="text-amber-500">0{sec.number}.</span>
                  <span>{sec.title}</span>
                </h4>
                {sec.verdict && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {sec.verdict}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-7">
                {sec.content}
              </p>
            </div>
          ))}
        </div>

        {/* Report Footer Mandatory Safe Autonomy Clause */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1">
          <div className="font-bold text-slate-900 dark:text-white">
            Mandatory Non-Negotiable Autonomy Verification:
          </div>
          <p>
            No commit, push, or pull request was created. All 5 changed files remain uncommitted in your local working tree for developer review.
          </p>
        </div>
      </div>

    </div>
  );
};
