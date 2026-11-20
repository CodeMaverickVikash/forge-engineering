import React, { createContext, useContext, useState } from 'react';
import { TaskItem, ProjectContext } from '../types';
import { SAMPLE_TASKS, SAMPLE_PROJECT_CONTEXT, FORGE_LIFECYCLE_PHASES } from '../lib/data';

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
  stepTaskPhase: (taskId: string) => void;
  fastForwardTask: (taskId: string) => void;
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
      modelEscalated: false,
      events: [
        { id: `ev-${Date.now()}-1`, timestamp: 'Just now', phase: 1, type: 'lifecycle', title: 'Task Understood & Classified', detail: `Analyzed request: "${request}". Classifying size and risk tier.`, badge: 'Size M' },
        { id: `ev-${Date.now()}-2`, timestamp: 'Just now', phase: 2, type: 'tool', title: 'Stack Detector Execution', detail: 'Executed detect-stack.mjs into .forge/context.json', badge: '116 signatures' }
      ],
      files: [
        { path: `src/features/${slug}.ts`, status: 'added', linesAdded: 45, linesRemoved: 0, owner: 'forge-frontend-engineer', disjointChecked: true }
      ],
      diffs: [
        { path: `src/features/${slug}.ts`, additions: 45, deletions: 0, diff: `+ // Initial implementation for ${slug}\n+ export function executeFeature() { return true; }` }
      ]
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);
    setCurrentView('app-live');
    return newTask.id;
  };

  const stepTaskPhase = (taskId: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      const nextPhase = Math.min(t.phase + 1, 10);
      const phaseInfo = FORGE_LIFECYCLE_PHASES.find((p) => p.phase === nextPhase);
      const isComplete = nextPhase === 10;
      return {
        ...t,
        phase: nextPhase,
        phaseName: phaseInfo ? phaseInfo.name : t.phaseName,
        status: isComplete ? 'VERIFIED' : 'RUNNING',
        gatesPassed: isComplete ? 15 : Math.min(15, Math.floor((nextPhase / 10) * 15)),
        completedAt: isComplete ? 'Just now' : undefined
      };
    }));
  };

  const fastForwardTask = (taskId: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        phase: 10,
        phaseName: 'Report',
        status: 'VERIFIED',
        gatesPassed: 15,
        completedAt: 'Just now'
      };
    }));
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
        stepTaskPhase,
        fastForwardTask,
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
