import React from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CommandPalette } from './components/CommandPalette';
import { MarketingPage } from './views/marketing/MarketingPage';
import { AppLayout } from './views/app/AppLayout';
import { DashboardView } from './views/app/DashboardView';
import { TaskIntakeView } from './views/app/TaskIntakeView';
import { LiveExecutionView } from './views/app/LiveExecutionView';
import { ProjectMemoryView } from './views/app/ProjectMemoryView';
import { AgentRosterView } from './views/app/AgentRosterView';
import { QualityGatesView } from './views/app/QualityGatesView';
import { DeliveryReportView } from './views/app/DeliveryReportView';
import { SettingsView } from './views/app/SettingsView';

export const App: React.FC = () => {
  const { currentView } = useApp();

  // If in Marketing View, render top Navbar + Marketing Page + Footer
  if (currentView === 'marketing') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0A0D12] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <Navbar />
        <main className="flex-1">
          <MarketingPage />
        </main>
        <Footer />
        <CommandPalette />
      </div>
    );
  }

  // If in App Console Views, render AppLayout with the active view inside
  const renderAppContent = () => {
    switch (currentView) {
      case 'app-dashboard':
        return <DashboardView />;
      case 'app-intake':
        return <TaskIntakeView />;
      case 'app-live':
        return <LiveExecutionView />;
      case 'app-memory':
        return <ProjectMemoryView />;
      case 'app-agents':
        return <AgentRosterView />;
      case 'app-gates':
        return <QualityGatesView />;
      case 'app-report':
        return <DeliveryReportView />;
      case 'app-settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <>
      <AppLayout>
        {renderAppContent()}
      </AppLayout>
      <CommandPalette />
    </>
  );
};
