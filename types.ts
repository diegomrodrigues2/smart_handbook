export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  isOpen?: boolean; // For folders
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  thinkingSteps?: string[];
}

export interface AppState {
  currentFileId: string | null;
  sidebarOpen: boolean;
  chatOpen: boolean;
}

// Learning Mode Types
export interface SuggestedProblem {
  id: string;
  title: string;
  description: string;
  focus: 'algebraic' | 'geometric' | 'computational' | 'theoretical';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  completed?: boolean;
}

export interface IntroductionContent {
  formalDefinition: string;
  intuition: string;
  problems: SuggestedProblem[];
}

export interface LearningConcept {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  completed: boolean;
  supportLevel?: 1 | 2 | 3 | 4;
  introContent?: IntroductionContent;
  suggestedProblems?: SuggestedProblem[];
  activeProblemId?: string | null;
  problemSessions?: Record<string, LearningMessage[]>;
}

export interface LearningSession {
  noteId: string;
  noteName: string;
  concepts: LearningConcept[];
  currentConceptIndex: number;
  supportLevel: 1 | 2 | 3 | 4; // Least-to-Most prompting levels
  dialogHistory: LearningMessage[];
  isComplete: boolean;
}

export interface LearningMessage {
  id: string;
  role: 'tutor' | 'student';
  text: string;
  timestamp: Date;
  type: 'question' | 'answer' | 'hint' | 'feedback' | 'intro' | 'solution';
}