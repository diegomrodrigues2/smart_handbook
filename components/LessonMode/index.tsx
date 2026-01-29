import React, { useState, useEffect, useRef } from 'react';
import { LessonPlan, LessonSession } from '../../types';
import { generateLessonPlan, generateLessonContent, refineLessonPlan } from '../../services/lessonModeService';
import { useSubjectMode } from '../../hooks';
import LessonPlanView from './LessonPlanView';
import LessonContent from './LessonContent';
import { LessonModeProps } from './types';

// Helper to sanitize filename
const sanitizeFileName = (title: string): string => {
    return title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 50); // Limit length
};

// Helper to get parent folder path from noteId
const getParentFolderPath = (noteId: string): string[] => {
    const parts = noteId.split('/');
    // Remove filename and current folder to get parent
    if (parts.length >= 3) {
        return parts.slice(1, -2); // Skip root folder name and remove last 2 (folder + file)
    }
    return parts.slice(1, -1); // Just remove the file
};

const LessonMode: React.FC<LessonModeProps> = ({
    noteContent,
    noteName,
    noteId,
    directoryHandle,
    onClose,
    pdfData
}) => {
    const { mode } = useSubjectMode();
    const [plan, setPlan] = useState<LessonPlan | null>(null);
    const [planApproved, setPlanApproved] = useState(false);
    const [content, setContent] = useState('');
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(true);
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const initializedRef = useRef(false);

    // Generate plan on mount
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const generatePlan = async () => {
            setIsGeneratingPlan(true);
            setError(null);

            const generatedPlan = await generateLessonPlan(noteContent, mode, pdfData || undefined);

            if (generatedPlan) {
                setPlan(generatedPlan);
            } else {
                setError('Não foi possível gerar o plano da aula. Tente novamente.');
            }

            setIsGeneratingPlan(false);
        };

        generatePlan();
    }, [noteContent, pdfData]);

    const handleRegenerate = async () => {
        setIsGeneratingPlan(true);
        setError(null);
        setPlan(null);

        const generatedPlan = await generateLessonPlan(noteContent, mode, pdfData || undefined);

        if (generatedPlan) {
            setPlan(generatedPlan);
        } else {
            setError('Não foi possível gerar o plano da aula. Tente novamente.');
        }

        setIsGeneratingPlan(false);
    };

    const handleApprove = async () => {
        if (!plan) return;

        setPlanApproved(true);
        setIsGeneratingContent(true);
        setContent('');
        setIsSaved(false);

        await generateLessonContent(plan, noteContent, mode, (chunk) => {
            setContent(prev => prev + chunk);
        }, pdfData || undefined);

        setIsGeneratingContent(false);
    };

    const handleBackToPlan = () => {
        setPlanApproved(false);
        setContent('');
        setIsSaved(false);
    };

    const handleRefineWithFeedback = async (feedback: string) => {
        if (!plan) return;

        const refinedPlan = await refineLessonPlan(plan, noteContent, feedback);

        if (refinedPlan) {
            setPlan(refinedPlan);
        } else {
            setError('Não foi possível aplicar as alterações. Tente novamente.');
        }
    };

    const handleSaveLesson = async () => {
        if (!directoryHandle || !plan || !content) return;

        setIsSaving(true);

        try {
            // Get path to parent folder
            const parentPath = getParentFolderPath(noteId);

            // Navigate to parent folder
            let currentHandle: FileSystemDirectoryHandle = directoryHandle;
            for (const folderName of parentPath) {
                currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
            }

            // Create or get "aulas" folder
            const aulasHandle = await currentHandle.getDirectoryHandle('aulas', { create: true });

            // Generate filename
            const fileName = `${sanitizeFileName(plan.title)}.md`;

            // Create and write file
            const fileHandle = await aulasHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            setIsSaved(true);
        } catch (error) {
            console.error('Error saving lesson:', error);
            setError('Não foi possível salvar a aula. Verifique as permissões.');
        } finally {
            setIsSaving(false);
        }
    };

    // Loading state for plan generation
    if (isGeneratingPlan) {
        return (
            <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-lg overflow-hidden shadow-xl">
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center mb-6 animate-pulse">
                        <i className="fa-solid fa-chalkboard-teacher text-white text-2xl"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Gerando Plano da Aula</h2>
                    <p className="text-gray-500 mb-4">Analisando o conteúdo e estruturando uma aula de 45 minutos...</p>
                    <div className="flex items-center gap-2 text-indigo-600">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span className="text-sm">Processando...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !plan) {
        return (
            <div className="h-full flex flex-col bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-lg overflow-hidden shadow-xl">
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                        <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Erro ao Gerar Plano</h2>
                    <p className="text-gray-500 mb-6 text-center">{error}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleRegenerate}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-arrows-rotate"></i>
                            Tentar Novamente
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-lg overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                            <i className="fa-solid fa-chalkboard-teacher text-white"></i>
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">Modo Aula Acadêmica</h2>
                            <p className="text-xs text-gray-500 truncate max-w-[300px]">{noteName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {planApproved && (
                            <button
                                onClick={handleBackToPlan}
                                disabled={isGeneratingContent}
                                className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <i className="fa-solid fa-arrow-left"></i>
                                Ver Plano
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            title="Encerrar"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-3 flex items-center gap-4">
                    <div className={`flex items-center gap-2 text-sm ${!planApproved ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${!planApproved ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            1
                        </div>
                        <span>Plano</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-200">
                        <div className={`h-full bg-indigo-600 transition-all duration-500 ${planApproved ? 'w-full' : 'w-0'}`}></div>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${planApproved ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${planApproved ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            2
                        </div>
                        <span>Aula</span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden p-4">
                {!planApproved ? (
                    plan && (
                        <div className="h-full bg-white rounded-xl shadow-sm p-6 overflow-hidden">
                            <LessonPlanView
                                plan={plan}
                                isLoading={isGeneratingPlan}
                                onApprove={handleApprove}
                                onRegenerate={handleRegenerate}
                                onRefineWithFeedback={handleRefineWithFeedback}
                            />
                        </div>
                    )
                ) : (
                    <div className="h-full bg-white rounded-xl shadow-sm overflow-hidden">
                        <LessonContent
                            content={content}
                            isGenerating={isGeneratingContent}
                            onSave={directoryHandle ? handleSaveLesson : undefined}
                            isSaving={isSaving}
                            isSaved={isSaved}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonMode;
