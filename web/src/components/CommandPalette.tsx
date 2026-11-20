import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FORGE_SPECIALISTS, FORGE_QUALITY_GATES, FORGE_LIFECYCLE_PHASES } from '../lib/data';
import { 
  Search, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Settings, 
  FileText, 
  CheckCircle, 
  X,
  ArrowRight,
  Flame
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    setCurrentView, 
    createNewTask,
    tasks,
    setSelectedTaskId 
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  // Search items definition
  const actions = [
    { id: 'view-dashboard', title: 'Go to Workspace Dashboard', category: 'Navigation', icon: Layers, action: () => setCurrentView('app-dashboard') },
    { id: 'view-intake', title: 'Task Intake (/forge <request>)', category: 'Engineering', icon: Terminal, action: () => setCurrentView('app-intake') },
    { id: 'view-live', title: 'Live Execution Monitor (3-Level)', category: 'Engineering', icon: Cpu, action: () => setCurrentView('app-live') },
    { id: 'view-memory', title: 'Inspect Project Memory & Durable Conventions', category: 'Intelligence', icon: Database, action: () => setCurrentView('app-memory') },
    { id: 'view-agents', title: 'View 26 Specialist Agents Roster', category: 'Orchestration', icon: Cpu, action: () => setCurrentView('app-agents') },
    { id: 'view-gates', title: 'Inspect G1–G15 Quality Gates & Browser QA', category: 'Verification', icon: ShieldCheck, action: () => setCurrentView('app-gates') },
    { id: 'view-report', title: 'View 13-Section Engineering Report', category: 'Verification', icon: FileText, action: () => setCurrentView('app-report') },
    { id: 'view-settings', title: 'Platform Settings & Autonomy Guard', category: 'Configuration', icon: Settings, action: () => setCurrentView('app-settings') },
    { id: 'view-marketing', title: 'Return to Marketing Homepage', category: 'Navigation', icon: Flame, action: () => setCurrentView('marketing') },
  ];

  // Also include recent tasks in results
  const taskActions = tasks.map((t) => ({
    id: `task-${t.id}`,
    title: `${t.title} (${t.status})`,
    category: 'Recent Tasks',
    icon: CheckCircle,
    action: () => {
      setSelectedTaskId(t.id);
      setCurrentView('app-live');
    }
  }));

  const allItems = [...actions, ...taskActions];
  const filtered = allItems.filter((item) => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleExecute = (actionFn: () => void) => {
    actionFn();
    setCommandPaletteOpen(false);
    setQuery('');
  };

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    createNewTask(query.trim());
    setCommandPaletteOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#111620] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header / input */}
        <form onSubmit={handleCreatePrompt} className="relative border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, navigate, or enter '/forge <task>'..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          {query.trim().length > 0 && (
            <button
              type="submit"
              className="text-xs px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 flex items-center gap-1"
            >
              <span>Run /forge</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Results list */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {query.trim().length > 0 && (
            <div className="p-2">
              <button
                onClick={() => {
                  createNewTask(query.trim());
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 flex items-center gap-3 transition-colors"
              >
                <Terminal className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    Dispatch to Forge Orchestrator:
                  </div>
                  <div className="text-xs font-mono truncate text-amber-600 dark:text-amber-400">
                    /forge {query}
                  </div>
                </div>
                <kbd className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-500 font-mono">
                  Enter
                </kbd>
              </button>
            </div>
          )}

          <div className="p-1 space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quick Actions & Destinations
            </div>
            {filtered.slice(0, 8).map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleExecute(item.action)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                    idx === selectedIndex 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.category}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">↵</kbd> Select</span>
            <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded">esc</kbd> Dismiss</span>
          </div>
          <span className="font-mono text-amber-600 dark:text-amber-400">FORGE v1.2</span>
        </div>
      </div>
    </div>
  );
};
