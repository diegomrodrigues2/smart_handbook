import React, { useState, useEffect, useRef } from 'react';
import { WorkbookExercise } from '../../types';
import { generateExerciseList, generateWorkbookSolution } from '../../services/workbookService';
import { useSubjectMode } from '../../hooks';
import { WorkbookModeProps } from './types';
import { LoadingState, ErrorState } from './StateDisplays';
import ExerciseCard from './ExerciseCard';

// Helper to sanitize filename
const sanitizeFileName = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 40); // Limit length
};

// Helper to get parent folder path from noteId
const getParentFolderPath = (noteId: string): string[] => {
    const parts = noteId.split('/');
    if (parts.length >= 3) {
        return parts.slice(1, -2);
    }
    return parts.slice(1, -1);
};

const WorkbookMode: React.FC<WorkbookModeProps> = ({
    noteContent,
    noteName,
    noteId,
    directoryHandle,
    onClose,
    pdfData
}) => {
    const { mode } = useSubjectMode();
    const [exercises, setExercises] = useState<WorkbookExercise[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null);
    const [currentSolutionStream, setCurrentSolutionStream] = useState('');
    const [savedCount, setSavedCount] = useState(0);
    const initializedRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate exercises on mount
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        generateExercises();
    }, [noteContent, pdfData]);

    const generateExercises = async () => {
        setIsLoading(true);
        setError(null);

        const generatedExercises = await generateExerciseList(noteContent, mode, pdfData || undefined);

        if (generatedExercises && generatedExercises.length > 0) {
            setExercises(generatedExercises);
        } else {
            setError('Não foi possível gerar os exercícios. Tente novamente.');
        }

        setIsLoading(false);
    };

    // Save exercise solution to file
    const saveExerciseToFile = async (exercise: WorkbookExercise, solution: string) => {
        if (!directoryHandle) return;

        try {
            const parentPath = getParentFolderPath(noteId);

            // Navigate to parent folder
            let currentHandle: FileSystemDirectoryHandle = directoryHandle;
            for (const folderName of parentPath) {
                currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
            }

            // Create or get "exercicios" folder
            const exerciciosHandle = await currentHandle.getDirectoryHandle('exercicios', { create: true });

            // Generate filename with exercise number
            const fileName = `Ex${exercise.number.toString().padStart(2, '0')}_${sanitizeFileName(exercise.topic)}.md`;

            // Format options section for multiple-choice exercises
            let optionsSection = '';
            if (exercise.questionType === 'multiple-choice' && exercise.options) {
                optionsSection = `\n## Alternativas\n\n${exercise.options.map(opt => `**${opt.label})** ${opt.text}`).join('\n\n')}\n`;
            }

            // Create markdown content
            const markdownContent = `# Exercício ${exercise.number}

**Tópico:** ${exercise.topic}
**Dificuldade:** ${exercise.difficulty === 'easy' ? 'Fácil' : exercise.difficulty === 'medium' ? 'Médio' : 'Difícil'}
${exercise.questionType === 'multiple-choice' ? `**Formato:** ${exercise.responseFormat === 'multiple' ? `Selecione ${exercise.selectCount}` : 'Múltipla Escolha'}` : ''}

---

## Enunciado

${exercise.statement}
${optionsSection}
---

## Gabarito

${solution}
`;

            // Create and write file
            const fileHandle = await exerciciosHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(markdownContent);
            await writable.close();

            setSavedCount(prev => prev + 1);
            console.log(`Exercise ${exercise.number} saved to exercicios/${fileName}`);
        } catch (err) {
            console.error('Error saving exercise:', err);
        }
    };

    const handleToggleSolution = (exerciseId: string) => {
        setExercises(prev => prev.map(ex =>
            ex.id === exerciseId
                ? { ...ex, isExpanded: !ex.isExpanded }
                : ex
        ));
    };

    // Handle answer selection for multiple-choice questions
    const handleSelectAnswer = (exerciseId: string, selectedLabels: string[]) => {
        setExercises(prev => prev.map(ex =>
            ex.id === exerciseId
                ? { ...ex, selectedAnswers: selectedLabels }
                : ex
        ));
    };

    // Extract correct answers from solution text
    const extractCorrectAnswers = (solutionText: string, exercise: WorkbookExercise): string[] => {
        if (exercise.questionType !== 'multiple-choice') return [];

        // Try to find patterns like "Resposta Correta" or "✅ Resposta Correta: A" or "A e C"
        const patterns = [
            /✅\s*Resposta\s*Correta[:\s]+([A-E](?:\s*e\s*[A-E])*)/i,
            /Resposta\s*Correta[:\s]+([A-E](?:\s*e\s*[A-E])*)/i,
            /Alternativa[s]?\s*Correta[s]?[:\s]+([A-E](?:\s*[,e]\s*[A-E])*)/i,
            /\[([A-E])\]\s*✅/g,
            /^([A-E])\).*✅\s*CORRETA/gim
        ];

        for (const pattern of patterns) {
            const match = solutionText.match(pattern);
            if (match) {
                // Extract all letters from the match
                const letters = match[1] || match[0];
                const extracted = letters.match(/[A-E]/g);
                if (extracted && extracted.length > 0) {
                    return extracted.map(l => l.toUpperCase());
                }
            }
        }

        // Fallback: look for ✅ CORRETA pattern in the text
        const correctMatches = solutionText.match(/\*\*([A-E])\).*?✅\s*CORRETA/gi);
        if (correctMatches) {
            return correctMatches.map(m => {
                const letterMatch = m.match(/\*\*([A-E])\)/i);
                return letterMatch ? letterMatch[1].toUpperCase() : '';
            }).filter(Boolean);
        }

        return [];
    };

    const handleGenerateSolution = async (exerciseId: string) => {
        const exercise = exercises.find(ex => ex.id === exerciseId);
        if (!exercise || exercise.isGeneratingSolution) return;

        // Mark as generating and expand
        setExercises(prev => prev.map(ex =>
            ex.id === exerciseId
                ? { ...ex, isGeneratingSolution: true, isExpanded: true }
                : ex
        ));

        setCurrentStreamingId(exerciseId);
        setCurrentSolutionStream('');

        let fullSolution = '';

        try {
            await generateWorkbookSolution(
                exercise,
                noteContent,
                mode,
                (chunk) => {
                    fullSolution += chunk;
                    setCurrentSolutionStream(fullSolution);
                },
                pdfData || undefined
            );

            // Extract correct answers from solution
            const correctAnswers = extractCorrectAnswers(fullSolution, exercise);

            // Save the complete solution with correct answers
            setExercises(prev => prev.map(ex =>
                ex.id === exerciseId
                    ? {
                        ...ex,
                        solution: fullSolution,
                        isGeneratingSolution: false,
                        correctAnswers: correctAnswers.length > 0 ? correctAnswers : undefined
                    }
                    : ex
            ));

            // Auto-save to file
            await saveExerciseToFile(exercise, fullSolution);
        } catch (err) {
            console.error('Error generating solution:', err);
            setExercises(prev => prev.map(ex =>
                ex.id === exerciseId
                    ? { ...ex, isGeneratingSolution: false }
                    : ex
            ));
        } finally {
            setCurrentStreamingId(null);
            setCurrentSolutionStream('');
        }
    };

    // Count stats
    const totalExercises = exercises.length;
    const solvedExercises = exercises.filter(ex => ex.solution).length;

    // Loading state
    if (isLoading) {
        return <LoadingState />;
    }

    // Error state
    if (error) {
        return <ErrorState onRetry={generateExercises} onClose={onClose} />;
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 rounded-lg overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-teal-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center shadow-md">
                            <i className="fa-solid fa-list-check text-white"></i>
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">Workbook</h2>
                            <p className="text-xs text-gray-500 truncate max-w-[250px]">{noteName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Stats */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-full border border-teal-100">
                            <i className="fa-solid fa-check-circle text-teal-600 text-sm"></i>
                            <span className="text-sm font-medium text-teal-700">
                                {solvedExercises}/{totalExercises}
                            </span>
                        </div>
                        {savedCount > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                                <i className="fa-solid fa-floppy-disk text-green-600 text-sm"></i>
                                <span className="text-sm font-medium text-green-700">
                                    {savedCount} salvos
                                </span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            title="Fechar"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${totalExercises > 0 ? (solvedExercises / totalExercises) * 100 : 0}%` }}
                    ></div>
                </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-4">
                    {exercises.map(exercise => (
                        <ExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            onToggleSolution={handleToggleSolution}
                            onGenerateSolution={handleGenerateSolution}
                            currentSolutionStream={currentStreamingId === exercise.id ? currentSolutionStream : ''}
                            isStreaming={currentStreamingId === exercise.id}
                            onSelectAnswer={handleSelectAnswer}
                        />
                    ))}
                </div>

                {/* Footer message */}
                <div className="max-w-3xl mx-auto mt-8 text-center">
                    <p className="text-sm text-gray-400">
                        <i className="fa-solid fa-lightbulb mr-2"></i>
                        Exercícios resolvidos são salvos automaticamente na pasta "exercicios"
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WorkbookMode;

