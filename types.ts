// ============================================================================
// PDF ANNOTATION TYPES
// ============================================================================

export interface PDFHighlight {
  id: string;
  pageNumber: number;
  // Coordenadas normalizadas (0-1) para compatibilidade com zoom/escala
  rects: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  text: string; // Texto destacado
  comment?: string; // Anotação opcional do usuário
  color: string; // Cor do highlight (hex)
  createdAt: Date;
  updatedAt?: Date;
}

export interface PDFMetadata {
  pdfPath: string;
  highlights: PDFHighlight[];
  lastModified: Date;
}

// ============================================================================
// FILE SYSTEM TYPES
// ============================================================================

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: 'markdown' | 'pdf'; // Tipo de arquivo para tratamento específico
  children?: FileNode[];
  content?: string;
  pdfMetadata?: PDFMetadata; // Metadados carregados para PDFs
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

// ============================================================================
// TAB SYSTEM TYPES
// ============================================================================

export type StudyModeType = 'learning' | 'lesson' | 'workbook' | 'challenge' | 'interview' | 'pairProgramming' | 'conceptExtraction' | 'excalidraw' | 'drawio' | 'projectSpec';

export interface Tab {
  id: string;
  fileId: string;              // Reference to FileNode.id
  name: string;                // Display name
  isPinned: boolean;           // false = preview (italic), true = pinned (normal)
  isStudyMode: boolean;        // true if this is a study mode tab
  studyModeType?: StudyModeType;
  fileType?: 'markdown' | 'pdf';
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

// Lesson Mode Types
export interface LessonSection {
  id: string;
  title: string;
  duration: string;
  type: 'introduction' | 'explanation' | 'example' | 'practice' | 'discussion' | 'conclusion';
  description: string;
}

export interface LessonPlan {
  title: string;
  duration: string;
  objectives: string[];
  sections: LessonSection[];
}

export interface LessonSession {
  noteId: string;
  noteName: string;
  noteContent: string;
  plan: LessonPlan | null;
  planApproved: boolean;
  generatedContent: string;
  isComplete: boolean;
}

// Workbook Mode Types
export interface WorkbookExerciseOption {
  label: string; // A, B, C, D, E
  text: string;
  isCorrect?: boolean; // Preenchido após gerar solução
}

export interface WorkbookExercise {
  id: string;
  number: number;
  statement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  solution?: string;
  isExpanded: boolean;
  isGeneratingSolution: boolean;
  // Campos para questões estilo AWS Certification
  questionType?: 'open' | 'multiple-choice';
  responseFormat?: 'single' | 'multiple'; // single = 1 resposta, multiple = selecione N
  selectCount?: number; // Quantas alternativas selecionar (para multiple)
  options?: WorkbookExerciseOption[];
  correctAnswers?: string[]; // Labels das respostas corretas (ex: ['A', 'C'])
  selectedAnswers?: string[]; // Labels selecionadas pelo usuário
}

export interface WorkbookSession {
  noteId: string;
  noteName: string;
  exercises: WorkbookExercise[];
  generatedAt: Date;
}

// Challenge Mode Types
export interface Challenge {
  id: string;
  title: string;
  type: 'System Design' | 'Low Level Design';
  description: string;
  ambiguousPrompt: string;
}

export type SubjectMode = 'mathematics' | 'computing' | 'data-engineering';

export interface ChallengeSession {
  noteId: string;
  noteName: string;
  mode: SubjectMode;
  alternatives: Challenge[];
  selectedChallenge: Challenge | null;
  messages: ChallengeMessage[];
  isComplete: boolean;
}

export interface ChallengeMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: Date;
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  audioUrl?: string;
}

// Interview Mode Types (Conceptual Technical Interview)
export interface InterviewQuestion {
  id: string;
  number: number;
  category: 'database_internals' | 'concurrency' | 'distributed_systems' | 'networking' | 'languages_runtimes' | 'os_fundamentals';
  difficulty: 'senior' | 'staff' | 'principal';
  question: string;
  expectedTopics: string[];
  answered: boolean;
  candidateResponse?: string;
  evaluation?: InterviewEvaluation;
}

export interface InterviewEvaluation {
  score: 'strong_hire' | 'hire' | 'mixed' | 'no_hire';
  dimensions: {
    depth: number; // 1-4
    tradeoffs: number; // 1-4
    communication: number; // 1-4
  };
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface InterviewSession {
  noteId: string;
  noteName: string;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  messages: InterviewMessage[];
  isComplete: boolean;
  finalVerdict?: {
    overallScore: 'strong_hire' | 'hire' | 'mixed' | 'no_hire';
    summary: string;
    recommendation: string;
  };
}

export interface InterviewMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: Date;
  questionId?: string;
  imageUrl?: string;
  audioUrl?: string;
}

// ============================================================================
// PAIR PROGRAMMING MODE TYPES
// ============================================================================

export type ProgrammingLanguage = 'python' | 'java' | 'cpp' | 'typescript' | 'go' | 'rust' | 'sql' | 'pyspark' | 'scala';

export type PairChallengeType = 'leetcode' | 'pseudocode' | 'spark-job' | 'sql-query' | 'dynamodb';

export interface PairChallenge {
  id: string;
  title: string;
  type: PairChallengeType;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  // Production-grade context
  businessContext?: string; // Company/team narrative context
  hiddenIssues?: string[]; // Hidden bugs/issues for candidate to find (internal use)
  expectedTopics: string[];
  // For LeetCode style
  inputFormat?: string;
  outputFormat?: string;
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints?: string[];
  // For Pseudocode/Design style
  conceptFocus?: string[];
  expectedSteps?: string[];
  initialDraft?: string;
}

export interface PairSession {
  noteId: string;
  noteName: string;
  challenges: PairChallenge[];
  selectedChallenge: PairChallenge | null;
  language: ProgrammingLanguage;
  currentCode: string;
  messages: PairMessage[];
  isComplete: boolean;
  solution?: {
    code: string;
    explanation: string;
    complexity: {
      time: string;
      space: string;
    };
    keyDecisions: string[];
  };
}

export interface PairMessage {
  id: string;
  role: 'navigator' | 'driver';
  text: string;
  timestamp: Date;
  codeSnapshot?: string;
  suggestedCode?: string;
}

// ============================================================================
// CONCEPT EXTRACTION MODE TYPES
// ============================================================================

export interface Concept {
  id: string;
  name: string;
  shortDefinition: string;
  fileName: string; // Suggested filename for the markdown file
  status: 'pending' | 'generating' | 'completed' | 'error';
}

export interface ExtractionSession {
  noteId: string;
  noteName: string;
  concepts: Concept[];
  isExtracting: boolean;
}

// ============================================================================
// PROJECT SPECIFICATION MODE TYPES
// ============================================================================

// Project specification type: from scratch (learning) or AWS (production)
export type ProjectSpecType = 'fromScratch' | 'aws';

// Project challenge - similar to Challenge but for project context
export interface ProjectChallenge {
  id: string;
  title: string;
  type: 'System Design' | 'Low Level Design';
  description: string;
  ambiguousPrompt: string; // The challenge prompt with intentional ambiguity
}

// Simplified session used only for saving specs
export interface ProjectSpecSession {
  noteId: string;
  noteName: string;
  mode: SubjectMode;
  specType: ProjectSpecType;
}

// ============================================================================
// BLOCK EDITOR TYPES (Notion-Style Inline Editing & LLM Actions)
// ============================================================================

export type BlockAction =
  | 'mermaid-sequence'
  | 'mermaid-graph'
  | 'mermaid-flowchart'
  | 'mermaid-class'
  | 'mermaid-er'
  | 'mermaid-state'
  | 'mermaid-gantt'
  | 'tradeoffs-table'
  | 'code-example'
  | 'implementation-guide'
  | 'enrich'
  | 'more-detailed'
  | 'summarize'
  | 'excalidraw'
  | 'drawio'
  | 'requirements'
  | 'api-contract'
  | 'system-spec'
  | 'implementation-design'
  | 'implementation-tasks';

export type CodeLanguage =
  | 'python'
  | 'java'
  | 'pseudocode'
  | 'terraform'
  | 'go'
  | 'typescript'
  | 'rust'
  | 'scala'
  | 'sql'
  | 'pyspark'
  | 'cloudformation'
  | 'kubernetes';

export interface ConceptSuggestion {
  id: string;
  title: string;
  description: string;
  sectionType: string; // e.g., 'tradeoffs', 'code-example', 'diagram', 'implementation-guide'
}

export interface NoteMetadata {
  sourceFile?: string;       // Path to the source file (PDF or MD) that generated this concept
  sourceType?: 'pdf' | 'md';
  suggestions?: ConceptSuggestion[];
  createdAt?: string;
}

