import React from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Flame, 
  LayoutDashboard, 
  Terminal, 
  Cpu, 
  Database, 
  ShieldCheck, 
  FileText, 
  Settings, 
  GitBranch, 
  Search, 
  Sun, 
  Moon, 
  ArrowLeft,
  ChevronRight,
  FolderGit2,
  AlertCircle
} from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setCurrentView, setCommandPaletteOpen, selectedTask, projectContext } = useApp();
  const { theme, toggleTheme } = useTheme();

  const navItems: { view: ActiveView; label: string; icon: any; badge?: string }[] = [
    { view: 'app-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'app-intake', label: 'Task Intake (/forge)', icon: Terminal, badge: 'CLI' },
    { view: 'app-live', label: 'Live Execution Monitor', icon: Cpu, badge: '3-Level' },
    { view: 'app-memory', label: 'Project Memory & Context', icon: Database },
    { view: 'app-agents', label: '26 Specialist Roster', icon: Cpu },
    { view: 'app-gates', label: 'G1–G15 Quality Gates', icon: ShieldCheck, badge: '15' },
    { view: 'app-report', label: '13-Section Reports', icon: FileText },
    { view: 'app-settings', label: 'Settings & Git Guard', icon: Settings },
  ];

  const getBreadcrumbTitle = () => {
    switch (currentView) {
      case 'app-dashboard': return 'Workspace Overview';
      case 'app-intake': return 'Task Intake Console (/forge)';
      case 'app-live': return `Live Execution: ${selectedTask.slug}`;
      case 'app-memory': return 'Project Memory & Context (.forge)';
      case 'app-agents': return 'Specialist Agents & Routing Matrix';
      case 'app-gates': return 'Quality Gates (G1–G15) & Browser QA';
      case 'app-report': return `Execution Report: ${selectedTask.slug}`;
      case 'app-settings': return 'Platform Settings & Autonomy Policy';
      default: return 'Console';
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0A0D12] text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111620] flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Workspace Brand Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setCurrentView('marketing')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Flame className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>FORGE</span>
                  <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Console
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                  {projectContext.name}
                </div>
              </div>
            </button>
          </div>

          {/* Active Workspace / Repository Selector */}
          <div className="p-3">
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FolderGit2 className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="truncate">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {projectContext.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-slate-400" />
                    <span>{projectContext.branch}</span>
                    <span>•</span>
                    <span className="text-emerald-500">Clean</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Search Action */}
          <div className="px-3 pb-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 text-slate-500 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Command Palette</span>
              </span>
              <kbd className="text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Engineering Workspace
            </div>
            {navItems.map((item) => {
              const isActive = currentView === item.view;
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Git Guard Status & Theme Toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          
          {/* Autonomy Git Guard Pill */}
          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Git Guard Active</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              SAFE
            </span>
          </div>

          {/* Bottom Actions: Return to Marketing & Theme */}
          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
            <button
              onClick={() => setCurrentView('marketing')}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Marketing Site</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top App Header / Breadcrumb Bar */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-[#0A0D12]/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono">forge</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {getBreadcrumbTitle()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Claude Code / Antigravity Native</span>
            </div>
          </div>
        </header>

        {/* View Content Viewport */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>
    </div>
  );
};
