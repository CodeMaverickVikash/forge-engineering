import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
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

  // Search items definition grouped by category
  const actions = [
    { id: 'view-dashboard', title: 'Go to Workspace Dashboard', category: 'Navigation', icon: Layers, action: () => setCurrentView('app-dashboard') },
    { id: 'view-intake', title: 'Task Intake (/forge <request>)', category: 'Engineering Views', icon: Terminal, action: () => setCurrentView('app-intake') },
    { id: 'view-live', title: 'Live Execution Monitor (3-Level)', category: 'Engineering Views', icon: Cpu, action: () => setCurrentView('app-live') },
    { id: 'view-memory', title: 'Inspect Project Memory & Durable Conventions', category: 'Engineering Views', icon: Database, action: () => setCurrentView('app-memory') },
    { id: 'view-agents', title: 'View 26 Specialist Agents Roster', category: 'Engineering Views', icon: Cpu, action: () => setCurrentView('app-agents') },
    { id: 'view-gates', title: 'Inspect G1–G15 Quality Gates & Browser QA', category: 'Platform Actions', icon: ShieldCheck, action: () => setCurrentView('app-gates') },
    { id: 'view-report', title: 'View 13-Section Engineering Report', category: 'Platform Actions', icon: FileText, action: () => setCurrentView('app-report') },
    { id: 'view-settings', title: 'Platform Settings & Autonomy Guard', category: 'Platform Actions', icon: Settings, action: () => setCurrentView('app-settings') },
    { id: 'view-marketing', title: 'Return to Marketing Homepage', category: 'Navigation', icon: Flame, action: () => setCurrentView('marketing') },
  ];

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

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcut listener (Cmd+K, Escape, ArrowDown, ArrowUp, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        return;
      }

      if (!commandPaletteOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setCommandPaletteOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter') {
        if (query.trim().startsWith('/forge')) {
          e.preventDefault();
          createNewTask(query.trim());
          setCommandPaletteOpen(false);
          setQuery('');
        } else if (filtered[selectedIndex]) {
          e.preventDefault();
          filtered[selectedIndex].action();
          setCommandPaletteOpen(false);
          setQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen, filtered, selectedIndex, query, createNewTask]);

  if (!commandPaletteOpen) return null;

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

  const categories = ['Navigation', 'Engineering Views', 'Recent Tasks', 'Platform Actions'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="w-full max-w-2xl bg-white dark:bg-[#111620] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header / input */}
        <form onSubmit={handleCreatePrompt} className="relative border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            aria-label="Search commands, views, or tasks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, navigate, or enter '/forge <task>'..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          {query.trim().length > 0 && (
            <button
              type="submit"
              className="text-xs px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <span>Run /forge</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label="Close command palette"
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Results list grouped by category */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/50">
          {query.trim().length > 0 && !query.startsWith('/') && (
            <div className="p-2">
              <button
                onClick={() => {
                  createNewTask(query.trim());
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Terminal className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                    Dispatch to Forge Orchestrator:
                  </div>
                  <div className="text-xs font-mono truncate text-amber-700 dark:text-amber-400 font-bold">
                    /forge {query}
                  </div>
                </div>
                <kbd className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-400 font-mono font-bold">
                  Enter
                </kbd>
              </button>
            </div>
          )}

          {categories.map((category) => {
            const categoryItems = filtered.filter((i) => i.category === category);
            if (categoryItems.length === 0) return null;
            return (
              <div key={category} className="p-1 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {category}
                </div>
                {categoryItems.map((item) => {
                  const itemOverallIndex = filtered.indexOf(item);
                  const isSelected = itemOverallIndex === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleExecute(item.action)}
                      onMouseEnter={() => setSelectedIndex(itemOverallIndex)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        isSelected 
                          ? 'bg-amber-500/10 text-slate-900 dark:text-white font-medium border border-amber-500/30' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className="flex-1 truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.category}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">↵</kbd> Select</span>
            <span><kbd className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">esc</kbd> Dismiss</span>
          </div>
          <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">FORGE v1.2</span>
        </div>
      </div>
    </div>
  );
};
