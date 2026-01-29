import { LearningSession, LearningMessage, SuggestedProblem, IntroductionContent } from '../../types';

export interface LearningModeState {
    session: LearningSession | null;
    isLoading: boolean;
    isThinking: boolean;
    input: string;
    currentTutorMessage: string;
    complexityLevel: 1 | 2 | 3;
    suggestedProblems: SuggestedProblem[];
    introContent: IntroductionContent | null;
    showProblemSelector: boolean;
}

export interface LearningModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    directoryHandle?: FileSystemDirectoryHandle | null;
    onClose: () => void;
}

export interface LearningModeActions {
    handleSend: () => Promise<void>;
    handleSolveStepByStep: () => Promise<void>;
    handleSwitchConcept: (newIndex: number) => Promise<void>;
    handleSkipConcept: () => void;
    handlePreviousConcept: () => void;
    handleIncreaseComplexity: () => Promise<void>;
    handleSelectProblem: (problem: SuggestedProblem) => Promise<void>;
    setInput: (value: string) => void;
    setShowProblemSelector: (value: boolean) => void;
}
