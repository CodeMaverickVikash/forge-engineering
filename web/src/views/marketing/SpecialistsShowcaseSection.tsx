import React, { useState } from 'react';
import { FORGE_SPECIALISTS } from '../../lib/data';
import { DivisionName } from '../../types';
import { 
  Users, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  Search, 
  Clock, 
  Wrench, 
  Check, 
  ChevronRight,
  Code
} from 'lucide-react';

const DIVISIONS: DivisionName[] = [
  'Architecture & Engineering',
  'Quality',
  'Product',
  'Delivery',
  'Intelligence'
];

export const SpecialistsShowcaseSection: React.FC = () => {
  const [selectedDivision, setSelectedDivision] = useState<DivisionName>('Architecture & Engineering');
  const [activeSpecialistId, setActiveSpecialistId] = useState<string>('forge-architect');

  const filtered = FORGE_SPECIALISTS.filter((s) => s.division === selectedDivision);
  const activeSpecialist = FORGE_SPECIALISTS.find((s) => s.id === activeSpecialistId) || filtered[0];

  return (
    <section id="specialists" className="py-24 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0D12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Autonomous Organization
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            26 Specialists. 5 Engineering Divisions.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Forge assembles the smallest team of specialists that covers each task's risks. Every agent has calibrated turn caps, preloaded skills, and least-privilege tool access.
          </p>
        </div>

        {/* Division Selector Pills */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
          {DIVISIONS.map((div) => {
            const isSelected = selectedDivision === div;
            const count = FORGE_SPECIALISTS.filter((s) => s.division === div).length;
            return (
              <button
                key={div}
                onClick={() => {
                  setSelectedDivision(div);
                  const first = FORGE_SPECIALISTS.find((s) => s.division === div);
                  if (first) setActiveSpecialistId(first.id);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{div}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Specialists Matrix & Detail Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Specialist List */}
          <div className="lg:col-span-5 space-y-2">
            {filtered.map((specialist) => {
              const isSelected = activeSpecialistId === specialist.id;
              const isMainModel = specialist.model === 'inherit';
              return (
                <button
                  key={specialist.id}
                  onClick={() => setActiveSpecialistId(specialist.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white ring-1 ring-amber-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111620]/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isMainModel 
                        ? 'bg-purple-500/20 text-purple-500 dark:text-purple-400' 
                        : 'bg-blue-500/20 text-blue-500 dark:text-blue-400'
                    }`}>
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-mono truncate">{specialist.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{specialist.modelTierDescription}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {specialist.maxTurns} turns
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Specialist Detail Card */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111620] p-6 sm:p-8 shadow-xl">
            {activeSpecialist && (
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono uppercase font-bold text-amber-600 dark:text-amber-400">
                        {activeSpecialist.division} Division
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {activeSpecialist.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Cap: {activeSpecialist.maxTurns} Turns
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeSpecialist.description}
                </p>

                {/* Responsibilities */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Core Engineering Responsibilities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeSpecialist.responsibilities.map((resp, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tool Permissions & Preloaded Skills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-amber-500" />
                      <span>Least-Privilege Tools</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                      {activeSpecialist.tools.map((tool) => (
                        <span key={tool} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Preloaded Skills</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                      {activeSpecialist.preloadedSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
