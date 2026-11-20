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

  const sections = selectedTask.reportSections || SAMPLE_REVIEW_SECTIONS;

  const fullReportMarkdown = `### FORGE Execution Report

**Task:** ${selectedTask.slug}
**Status:** ${selectedTask.status}
**Request:** ${selectedTask.request}
**Files Changed:** ${selectedTask.filesChanged} (Disjoint boundaries checked)
**Quality Gates:** ${selectedTask.gatesPassed}/${selectedTask.totalGates} PASSED
**Git Guard:** Enforced (0 commits, 0 pushes created)

${sections.map((sec) => `#### ${sec.number}. ${sec.title}\n${sec.content}`).join('\n\n')}

No commit, push, or pull request was created. All changes remain uncommitted in the working tree for review.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullReportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullReportMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${selectedTask.slug}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToSection = (secNumber: number) => {
    const el = document.getElementById(`report-sec-${secNumber}`);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>PHASE 10: DELIVERED ENGINEERING RECORD</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            13-Section Engineering Delivery Report
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Saved to <code className="text-amber-600 dark:text-amber-400 font-mono font-bold">.forge/tasks/{selectedTask.slug}/report.md</code> with indexed evidence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Download markdown report file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Copy report markdown to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span role="status" aria-live="polite">{copied ? 'Copied' : 'Copy Markdown'}</span>
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

        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shrink-0 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Commits Created</span>
        </div>
      </div>

      {/* Main Grid: Sticky TOC Sidebar + 13-Section Structured Document */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sticky Table of Contents (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-4 space-y-2">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            Report Index (13 Sections)
          </div>
          <nav className="space-y-1 text-xs">
            {sections.map((sec) => (
              <button
                key={sec.number}
                type="button"
                onClick={() => scrollToSection(sec.number)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span className="truncate pr-2">0{sec.number}. {sec.title}</span>
                <ChevronRight className="w-3 h-3 shrink-0 text-slate-400" />
              </button>
            ))}
          </nav>
        </div>

        {/* 13-Section Structured Document */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Grounded Engineering Review
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
              ### FORGE Execution Report
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 space-y-6">
            {sections.map((sec) => (
              <div key={sec.number} id={`report-sec-${sec.number}`} className="pt-6 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 font-mono">
                    <span className="text-amber-600 dark:text-amber-400">0{sec.number}.</span>
                    <span>{sec.title}</span>
                  </h4>
                  {sec.verdict && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {sec.verdict}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-7 whitespace-pre-line">
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

          {/* Safe Autonomy Clause */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 text-xs text-slate-500 space-y-1">
            <div className="font-bold text-slate-700 dark:text-slate-300">
              Safe Autonomy Verification Notice
            </div>
            <p>
              No commit, push, or pull request was created. All changes remain uncommitted in the working tree for review.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
