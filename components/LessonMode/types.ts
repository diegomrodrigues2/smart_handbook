import { LessonPlan, LessonSection, LessonSession } from '../../types';

export interface LessonModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    tabId?: string;
    directoryHandle?: FileSystemDirectoryHandle | null;
    onClose: () => void;
    pdfData?: ArrayBuffer | null;
}

export interface LessonModeState {
    session: LessonSession;
    isGeneratingPlan: boolean;
    isGeneratingContent: boolean;
    error: string | null;
}

export interface LessonPlanViewProps {
    plan: LessonPlan;
    isLoading: boolean;
    onApprove: () => void;
    onRegenerate: () => void;
    onRefineWithFeedback: (feedback: string) => Promise<void>;
}

export interface LessonContentProps {
    content: string;
    isGenerating: boolean;
    onSave?: () => void;
    isSaving?: boolean;
    isSaved?: boolean;
}
