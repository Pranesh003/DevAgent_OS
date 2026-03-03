import { create } from 'zustand';

interface AgentMessage {
  agent: string;
  content: string;
  timestamp: string;
  action?: string;
  phase?: string;
  model?: string;
  critique_score?: number;
}

interface CodeFile {
  path: string;
  filename: string;
  language: string;
  content: string;
  description?: string;
}

interface AgentSessionState {
  sessionId: string | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentPhase: string;
  iteration: number;
  messages: AgentMessage[];
  codeFiles: CodeFile[];
  documentation: Record<string, string>;
  architecture: Record<string, any>;
  debugOutput: Record<string, any>;
  tests: any[];
  critiqueScore: number | null;
  activeProject: any | null;
  sessionStartTime: number | null;
  selectedFile: CodeFile | { path: string, content: string, type: 'documentation' | 'architecture' | 'debug' | 'testing' } | null;

  // Actions
  startSession: (sessionId: string, projectId: string) => void;
  addMessage: (msg: AgentMessage) => void;
  setStatus: (status: AgentSessionState['status']) => void;
  setCurrentPhase: (phase: string) => void;
  setCodeFiles: (files: CodeFile[]) => void;
  setDocumentation: (docs: Record<string, string>) => void;
  setArchitecture: (arch: Record<string, any>) => void;
  setDebugOutput: (debug: Record<string, any>) => void;
  setTests: (tests: any[]) => void;
  setCritiqueScore: (score: number) => void;
  setActiveProject: (project: any) => void;
  setSelectedFile: (file: any) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentSessionState>((set) => ({
  sessionId: null,
  status: 'idle',
  currentPhase: '',
  iteration: 0,
  messages: [],
  codeFiles: [],
  documentation: {},
  architecture: {},
  debugOutput: {},
  tests: [],
  critiqueScore: null,
  activeProject: null,
  sessionStartTime: null,
  selectedFile: null,

  startSession: (sessionId, _projectId) =>
    set({ sessionId, status: 'running', messages: [], codeFiles: [], documentation: {}, architecture: {}, debugOutput: {}, tests: [], critiqueScore: null, currentPhase: 'requirement', iteration: 0, sessionStartTime: Date.now() }),

  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, msg],
      currentPhase: msg.phase || s.currentPhase,
      iteration: msg.action === 'output' ? s.iteration : s.iteration,
      critiqueScore: msg.critique_score !== undefined ? msg.critique_score : s.critiqueScore,
    })),

  setStatus: (status) => set({ status }),
  setCurrentPhase: (currentPhase) => set({ currentPhase }),
  setCodeFiles: (codeFiles) => set({ codeFiles }),
  setDocumentation: (documentation) => set({ documentation }),
  setArchitecture: (architecture) => set({ architecture }),
  setDebugOutput: (debugOutput) => set({ debugOutput }),
  setTests: (tests) => set({ tests }),
  setCritiqueScore: (critiqueScore) => set({ critiqueScore }),
  setActiveProject: (activeProject) => set({ activeProject }),
  setSelectedFile: (selectedFile) => set({ selectedFile }),
  reset: () => set({ sessionId: null, status: 'idle', currentPhase: '', iteration: 0, messages: [], codeFiles: [], documentation: {}, architecture: {}, debugOutput: {}, tests: [], critiqueScore: null, sessionStartTime: null, selectedFile: null }),
}));
