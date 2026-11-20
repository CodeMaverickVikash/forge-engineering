import React, { createContext, useContext, useState } from 'react';
import { TaskItem, ProjectContext } from '../types';
import { SAMPLE_TASKS, SAMPLE_PROJECT_CONTEXT } from '../lib/data';

export type ActiveView = 
  | 'marketing' 
  | 'app-dashboard' 
  | 'app-intake' 
  | 'app-live' 
  | 'app-tasks' 
  | 'app-memory' 
  | 'app-agents' 
  | 'app-gates' 
  | 'app-report' 
  | 'app-settings';

interface AppContextType {
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  tasks: TaskItem[];
  selectedTaskId: string;
  setSelectedTaskId: (id: string) => void;
  selectedTask: TaskItem;
  projectContext: ProjectContext;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  createNewTask: (request: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ActiveView>('marketing');
  const [tasks, setTasks] = useState<TaskItem[]>(SAMPLE_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(SAMPLE_TASKS[0].id);
  const [projectContext] = useState<ProjectContext>(SAMPLE_PROJECT_CONTEXT);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  const createNewTask = (request: string): string => {
    const slug = request.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || 'new-engineering-task';
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      slug,
      title: request.replace(/^\/forge\s*/i, '').slice(0, 80),
      request: request.startsWith('/forge') ? request : `/forge ${request}`,
      status: 'RUNNING',
      size: 'M',
      phase: 1,
      phaseName: 'Understand',
      specialists: ['forge-architect', 'forge-frontend-engineer', 'forge-backend-engineer', 'forge-browser-qa'],
      startedAt: 'Just now',
      filesChanged: 1,
      gatesPassed: 2,
      totalGates: 15,
      summary: 'Task initialized. Exploring project context with detect-stack.mjs and structuring specification.',
      branch: `forge/${slug.slice(0, 16)}`,
      commitGuard: 'ENFORCED',
      evidenceCount: 1,
      modelEscalated: false
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    setCurrentView('app-live');
    return newTask.id;
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        tasks,
        selectedTaskId,
        setSelectedTaskId,
        selectedTask,
        projectContext,
        commandPaletteOpen,
        setCommandPaletteOpen,
        createNewTask,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
