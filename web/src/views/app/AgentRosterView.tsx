import React, { useState } from 'react';
import { FORGE_SPECIALISTS } from '../../lib/data';
import { DivisionName } from '../../types';
import { 
  Users, 
  Cpu, 
  Wrench, 
  Zap, 
  Search, 
  Clock, 
  ShieldCheck, 
  Filter,
  Check
} from 'lucide-react';

export const AgentRosterView: React.FC = () => {
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const divisions = ['All', 'Architecture & Engineering', 'Quality', 'Product', 'Delivery', 'Intelligence'];

  const filtered = FORGE_SPECIALISTS.filter((s) => {
    const matchesDiv = selectedDivision === 'All' || s.division === selectedDivision;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tools.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDiv && matchesQuery;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 mb-1">
          <Cpu className="w-4 h-4" />
          <span>AUTONOMOUS WORKFORCE MATRIX</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          26 Specialist Subagents Catalog
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Each specialist has bounded turn limits (maxTurns), least-privilege tool allow-lists, preloaded skill frontmatter, and strict disjoint file ownership.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Division Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {divisions.map((div) => {
            const isSelected = selectedDivision === div;
            return (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {div}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter specialists or tools..."
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Grid of Specialists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((specialist) => {
          const isMainModel = specialist.model === 'inherit';
          return (
            <div
              key={specialist.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111620] p-5 shadow-sm hover:border-amber-500/40 transition-colors flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
                    {specialist.division}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {specialist.maxTurns} turns cap
                  </span>
                </div>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isMainModel ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {specialist.name}
                    </h3>
                    <div className="text-[11px] text-slate-500">{specialist.modelTierDescription}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {specialist.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <div className="flex flex-wrap gap-1 font-mono text-[9px]">
                  {specialist.tools.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
