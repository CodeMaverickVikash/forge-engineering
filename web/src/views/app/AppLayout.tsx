import React, { useState, useEffect } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
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
  ArrowLeft,
  FolderGit2,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentView, setCurrentView, setCommandPaletteOpen, selectedTask, projectContext } = useApp();
  
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);

  // Keyboard shortcut listener for compact sidebar (Cmd+B / Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCompactSidebar((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleNavClick = (view: ActiveView) => {
    setCurrentView(view);
    setMobileDrawerOpen(false);
  };

  const sidebarContent = (isDrawer = false) => (
    <div className="flex flex-col justify-between h-full select-none">
      <div>
        {/* Workspace Brand Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => handleNavClick('app-dashboard')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-0.5"
            aria-label="Forge Workspace Dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4 fill-slate-950" />
            </div>
            {(!compactSidebar || isDrawer) && (
              <div>
                <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>FORGE</span>
                  <span className="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    Console
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[130px]">
                  {projectContext.name}
                </div>
              </div>
            )}
          </button>
          
          {isDrawer && (
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Active Workspace / Repository Selector */}
        {(!compactSidebar || isDrawer) && (
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
                    <span className="text-emerald-500 font-semibold">Clean</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Search Action */}
        <div className="px-3 pb-2 pt-1">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 text-slate-500 text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${compactSidebar && !isDrawer ? 'justify-center px-1' : ''}`}
            title="Command Palette (Cmd+K)"
            aria-label="Open Command Palette (⌘K)"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              {(!compactSidebar || isDrawer) && <span>Command Palette</span>}
            </span>
            {(!compactSidebar || isDrawer) && (
              <kbd className="text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Engineering workspace views" className="px-3 py-2 space-y-1">
          {(!compactSidebar || isDrawer) && (
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Engineering Workspace
            </div>
          )}
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  compactSidebar && !isDrawer ? 'justify-center px-2' : ''
                } ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={compactSidebar && !isDrawer ? item.label : undefined}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                  {(!compactSidebar || isDrawer) && <span>{item.label}</span>}
                </span>
                {(!compactSidebar || isDrawer) && item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
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
        {(!compactSidebar || isDrawer) && (
          <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Git Guard Active</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
              SAFE
            </span>
          </div>
        )}

        <div className={`flex items-center justify-between pt-1 text-xs text-slate-500 ${compactSidebar && !isDrawer ? 'flex-col gap-2' : ''}`}>
          <button
            onClick={() => handleNavClick('marketing')}
            className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded p-1"
            title="Return to Marketing Site"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {(!compactSidebar || isDrawer) && <span>Marketing Site</span>}
          </button>

          <div className="flex items-center gap-1">
            {!isDrawer && (
              <button
                onClick={() => setCompactSidebar(!compactSidebar)}
                className="hidden lg:flex p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                title={compactSidebar ? 'Expand Sidebar (⌘B)' : 'Collapse Sidebar (⌘B)'}
                aria-label={compactSidebar ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {compactSidebar ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0A0D12] text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Desktop Sidebar Navigation */}
      <aside 
        aria-label="Console sidebar"
        className={`hidden lg:flex flex-col justify-between shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111620] transition-all duration-200 ${
          compactSidebar ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay and Sidebar (< 1024px) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            aria-label="Console mobile navigation"
            className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#111620] border-r border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in slide-in-from-left duration-200 flex flex-col justify-between"
          >
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top App Header / Breadcrumb Bar */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#0A0D12]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3 text-xs">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Open sidebar navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <span className="text-slate-400 font-mono">forge</span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-md">
              {getBreadcrumbTitle()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">Claude Code / Antigravity Native</span>
              <span className="sm:hidden">Native</span>
            </div>
          </div>
        </header>

        {/* View Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>
    </div>
  );
};
