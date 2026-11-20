export type ThemeMode = 'dark' | 'light';

export type TaskStatus = 'VERIFIED' | 'VERIFIED WITH LIMITATIONS' | 'RUNNING' | 'GATED' | 'BLOCKED' | 'FAILED';

export type TaskSize = 'Q' | 'S' | 'M' | 'L';

export interface TaskDiffItem {
  path: string;
  additions: number;
  deletions: number;
  diff: string;
}

export type FileChangeItem = FileChange;
export type ReviewSectionItem = ReviewSection;

export interface TaskItem {
  id: string;
  slug: string;
  title: string;
  request: string;
  status: TaskStatus;
  size: TaskSize;
  phase: number; // 1 to 10
  phaseName: string;
  specialists: string[];
  startedAt: string;
  completedAt?: string;
  filesChanged: number;
  gatesPassed: number;
  totalGates: number;
  summary: string;
  branch: string;
  commitGuard: 'ENFORCED' | 'BYPASS_DISABLED';
  evidenceCount: number;
  modelEscalated?: boolean;
  events?: ExecutionEvent[];
  files?: FileChange[];
  diffs?: TaskDiffItem[];
  reportSections?: ReviewSection[];
}

export type DivisionName = 
  | 'Product' 
  | 'Architecture & Engineering' 
  | 'Quality' 
  | 'Delivery' 
  | 'Intelligence';

export interface SpecialistAgent {
  id: string;
  name: string;
  division: DivisionName;
  model: 'inherit' | 'sonnet' | 'opus';
  modelTierDescription: string;
  maxTurns: number;
  description: string;
  tools: string[];
  preloadedSkills: string[];
  responsibilities: string[];
}

export type GateVerdict = 
  | 'PASSED' 
  | 'FAILED' 
  | 'PRE-EXISTING' 
  | 'BLOCKED' 
  | 'NOT RUN' 
  | 'UNAVAILABLE' 
  | 'N/A';

export interface QualityGate {
  id: string; // G1 to G15
  name: string;
  description: string;
  category: 'Static Analysis' | 'Automated Tests' | 'Security & Risk' | 'Browser & UX' | 'Review & Integrity';
  status: GateVerdict;
  executionTime?: string;
  evidence?: string;
  blockingPreBrowser?: boolean;
}

export interface ProjectContext {
  name: string;
  repository: string;
  branch: string;
  stack: {
    runtime: string;
    languages: string[];
    frameworks: string[];
    packageManager: string;
    testRunners: string[];
    browserQA: string;
  };
  detectedSignatures: number;
  durableKnowledge: {
    title: string;
    convention: string;
    source: string;
    lastVerified: string;
  }[];
  gitState: {
    clean: boolean;
    uncommittedDiffs: number;
    headSha: string;
    guardActive: boolean;
  };
}

export interface ExecutionEvent {
  id: string;
  timestamp: string;
  phase: number;
  agent?: string;
  type: 'lifecycle' | 'agent' | 'tool' | 'gate' | 'fix' | 'evidence';
  title: string;
  detail: string;
  badge?: string;
  status?: 'success' | 'running' | 'warning' | 'error';
}

export interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  owner: string;
  disjointChecked: boolean;
}

export interface ReviewSection {
  number: number;
  title: string;
  content: string;
  verdict?: 'APPROVE' | 'REQUEST_CHANGES' | 'INFORMATIONAL';
}
