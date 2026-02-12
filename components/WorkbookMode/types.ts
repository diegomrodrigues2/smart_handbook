export interface WorkbookModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    tabId?: string;
    directoryHandle?: FileSystemDirectoryHandle | null;
    onClose: () => void;
    pdfData?: ArrayBuffer | null;
}

export interface ExerciseCardProps {
    exercise: import('../../types').WorkbookExercise;
    onToggleSolution: (exerciseId: string) => void;
    onGenerateSolution: (exerciseId: string) => void;
    currentSolutionStream: string;
    isStreaming: boolean;
    onSelectAnswer?: (exerciseId: string, selectedLabels: string[]) => void;
}

export interface SolutionViewProps {
    solution: string;
    isStreaming: boolean;
    streamingContent: string;
}
