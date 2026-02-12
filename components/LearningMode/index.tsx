import React, { useState, useEffect, useRef } from 'react';
import { LearningSession, LearningMessage, SuggestedProblem, IntroductionContent } from '../../types';
import {
    createLearningSession,
    generateSocraticQuestion,
    evaluateStudentResponse,
    generateIntroduction,
    generateStepByStepSolution
} from '../../services/learningModeService';
import { useSubjectMode } from '../../hooks';

// Sub-components
import MessageList from './MessageList';
import SuggestedProblems from './SuggestedProblems';
import ConceptNavigator from './ConceptNavigator';
import InputArea from './InputArea';
import { ConceptIntroduction, ActiveProblemStatement } from './ContentCards';
import { LoadingState, ErrorState, CompletedState } from './StateDisplays';

interface LearningModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    tabId?: string;
    directoryHandle?: FileSystemDirectoryHandle | null;
    onClose: () => void;
    pdfData?: ArrayBuffer | null;
}

// Helper to sanitize filename
const sanitizeFileName = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 40);
};

// Helper to get parent folder path from noteId
const getParentFolderPath = (noteId: string): string[] => {
    const parts = noteId.split('/');
    if (parts.length >= 3) {
        return parts.slice(1, -2);
    }
    return parts.slice(1, -1);
};

const LearningMode: React.FC<LearningModeProps> = ({
    noteContent,
    noteName,
    noteId,
    directoryHandle,
    onClose,
    pdfData
}) => {
    const { mode } = useSubjectMode();
    const [session, setSession] = useState<LearningSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isThinking, setIsThinking] = useState(false);
    const [input, setInput] = useState('');
    const [currentTutorMessage, setCurrentTutorMessage] = useState('');
    const [complexityLevel, setComplexityLevel] = useState<1 | 2 | 3>(1);
    const [suggestedProblems, setSuggestedProblems] = useState<SuggestedProblem[]>([]);
    const [introContent, setIntroContent] = useState<IntroductionContent | null>(null);
    const [showProblemSelector, setShowProblemSelector] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);
    const currentConceptIndexRef = useRef(0);
    const [pregeneratingIndices, setPregeneratingIndices] = useState<Set<number>>(new Set());

    // Sync ref with state
    useEffect(() => {
        if (session) {
            currentConceptIndexRef.current = session.currentConceptIndex;
        }
    }, [session?.currentConceptIndex]);

    // Initialize session
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const init = async () => {
            setIsLoading(true);
            const newSession = await createLearningSession(
                noteId,
                noteName,
                noteContent,
                mode,
                pdfData || undefined
            );
            if (newSession) {
                setSession(newSession);
                await generateFirstQuestion(newSession);
            }
            setIsLoading(false);
        };
        init();
    }, [noteId, noteName, noteContent, mode, pdfData]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session?.dialogHistory, currentTutorMessage]);

    // Background pre-generation
    useEffect(() => {
        if (!session || session.isComplete) return;

        const pregenerateNext = async () => {
            const nextIndices: number[] = [];
            // Try to pre-generate the next 2 concepts
            for (let i = 1; i <= 2; i++) {
                const idx = session.currentConceptIndex + i;
                if (
                    idx < session.concepts.length &&
                    !session.concepts[idx].introContent &&
                    !pregeneratingIndices.has(idx)
                ) {
                    nextIndices.push(idx);
                }
            }

            if (nextIndices.length === 0) return;

            for (const idx of nextIndices) {
                // Mark as pre-generating
                setPregeneratingIndices(prev => {
                    const next = new Set(prev);
                    next.add(idx);
                    return next;
                });

                const concept = session.concepts[idx];

                // Fire and forget (it will update session when done)
                generateIntroduction(concept.title, concept.description, mode).then(intro => {
                    if (intro) {
                        setSession(prev => {
                            if (!prev) return null;
                            const newConcepts = [...prev.concepts];

                            if (newConcepts[idx].introContent) return prev;

                            const introText = `## Definição Formal\n\n${intro.formalDefinition}\n\n## Intuição\n\n${intro.intuition}\n\nEscolha um dos problemas abaixo para começarmos:`;
                            const introMsg: LearningMessage = {
                                id: `pre_${Date.now()}_${idx}`,
                                role: 'tutor',
                                text: introText,
                                timestamp: new Date(),
                                type: 'intro'
                            };

                            newConcepts[idx] = {
                                ...newConcepts[idx],
                                introContent: intro,
                                suggestedProblems: intro.problems,
                                problemSessions: {
                                    ...(newConcepts[idx].problemSessions || {}),
                                    '__intro__': [introMsg]
                                }
                            };

                            // If user is currently waiting on this concept, stop thinking
                            if (prev.currentConceptIndex === idx) {
                                setIsThinking(false);
                            }

                            return { ...prev, concepts: newConcepts };
                        });
                    }

                    setPregeneratingIndices(prev => {
                        const next = new Set(prev);
                        next.delete(idx);
                        return next;
                    });
                }).catch(err => {
                    console.error(`Error in background pre-generation for concept ${idx}:`, err);
                    setPregeneratingIndices(prev => {
                        const next = new Set(prev);
                        next.delete(idx);
                        return next;
                    });
                    setSession(prev => {
                        if (prev?.currentConceptIndex === idx) {
                            setIsThinking(false);
                        }
                        return prev;
                    });
                });
            }
        };

        pregenerateNext();
    }, [session?.currentConceptIndex, session?.concepts?.length, mode]);

    // Keep introContent and suggestedProblems in sync with session
    useEffect(() => {
        if (session) {
            const current = session.concepts[session.currentConceptIndex];
            if (current.introContent && current.introContent !== introContent) {
                setIntroContent(current.introContent);
                setSuggestedProblems(current.suggestedProblems || []);
            }
        }
    }, [session?.currentConceptIndex, session?.concepts]);

    const generateFirstQuestion = async (sess: LearningSession) => {
        setIsThinking(true);

        const currentConcept = sess.concepts[sess.currentConceptIndex];
        if (!currentConcept) {
            setIsThinking(false);
            return;
        }

        const intro = await generateIntroduction(currentConcept.title, currentConcept.description, mode);

        if (intro) {
            setIntroContent(intro);
            setSuggestedProblems(intro.problems);

            const introText = `## Definição Formal\n\n${intro.formalDefinition}\n\n## Intuição\n\n${intro.intuition}\n\nEscolha um dos problemas abaixo para começarmos:`;

            const tutorMessage: LearningMessage = {
                id: Date.now().toString(),
                role: 'tutor',
                text: introText,
                timestamp: new Date(),
                type: 'intro'
            };

            setSession(prev => {
                if (!prev) return null;
                const newHistory = [...prev.dialogHistory, tutorMessage];
                const newConcepts = [...prev.concepts];
                newConcepts[0] = {
                    ...newConcepts[0],
                    introContent: intro,
                    suggestedProblems: intro.problems,
                    problemSessions: { '__intro__': newHistory }
                };
                return {
                    ...prev,
                    concepts: newConcepts,
                    dialogHistory: newHistory
                };
            });
        } else {
            let fullResponse = '';
            await generateSocraticQuestion(sess, mode, (chunk) => {
                fullResponse += chunk;
                setCurrentTutorMessage(fullResponse);
            });

            const tutorMessage: LearningMessage = {
                id: Date.now().toString(),
                role: 'tutor',
                text: fullResponse,
                timestamp: new Date(),
                type: 'intro'
            };

            const fallbackHistory = [tutorMessage];

            setSession(prev => {
                if (!prev) return null;
                const newConcepts = [...prev.concepts];
                newConcepts[0] = {
                    ...newConcepts[0],
                    problemSessions: { '__intro__': fallbackHistory }
                };
                return {
                    ...prev,
                    concepts: newConcepts,
                    dialogHistory: fallbackHistory
                };
            });
            setCurrentTutorMessage('');
        }

        setIsThinking(false);
    };

    const handleSend = async () => {
        if (!input.trim() || isThinking || !session) return;

        const studentMessage: LearningMessage = {
            id: Date.now().toString(),
            role: 'student',
            text: input,
            timestamp: new Date(),
            type: 'answer'
        };

        const updatedSession = {
            ...session,
            dialogHistory: [...session.dialogHistory, studentMessage]
        };
        setSession(updatedSession);
        setInput('');
        setIsThinking(true);

        const currentConcept = session.concepts[session.currentConceptIndex];
        const evaluation = await evaluateStudentResponse(currentConcept, input);

        const startIndex = session.currentConceptIndex;

        if (evaluation.action === 'advance') {
            const activeId = currentConcept.activeProblemId || '__intro__';
            const updatedProblemSessions = {
                ...(currentConcept.problemSessions || {}),
                [activeId]: updatedSession.dialogHistory
            };

            const finalizedConcepts = session.concepts.map((c, i) =>
                i === session.currentConceptIndex
                    ? {
                        ...c,
                        completed: true,
                        supportLevel: session.supportLevel,
                        introContent: introContent || undefined,
                        suggestedProblems: suggestedProblems,
                        problemSessions: updatedProblemSessions
                    }
                    : c
            );

            if (session.currentConceptIndex + 1 < session.concepts.length) {
                const nextIndex = session.currentConceptIndex + 1;
                const nextTargetConcept = finalizedConcepts[nextIndex];

                const targetActiveId = nextTargetConcept.activeProblemId || '__intro__';
                const targetHistory = nextTargetConcept.problemSessions?.[targetActiveId] || [];

                const transitionedSession: LearningSession = {
                    ...session,
                    concepts: finalizedConcepts,
                    currentConceptIndex: nextIndex,
                    dialogHistory: targetHistory,
                    supportLevel: nextTargetConcept.supportLevel || 1
                };

                setSession(transitionedSession);
                setIntroContent(nextTargetConcept.introContent || null);
                setSuggestedProblems(nextTargetConcept.suggestedProblems || []);
                setComplexityLevel(1);
                setCurrentTutorMessage('');

                if (!nextTargetConcept.introContent) {
                    setIsThinking(true);
                    if (!pregeneratingIndices.has(nextIndex)) {
                        const intro = await generateIntroduction(nextTargetConcept.title, nextTargetConcept.description, mode);

                        if (currentConceptIndexRef.current !== nextIndex) {
                            setIsThinking(false);
                            return;
                        }

                        if (intro) {
                            setIntroContent(intro);
                            setSuggestedProblems(intro.problems);
                            const iText = `## Definição Formal\n\n${intro.formalDefinition}\n\n## Intuição\n\n${intro.intuition}\n\nEscolha um dos problemas abaixo para começarmos:`;
                            const iMsg: LearningMessage = {
                                id: Date.now().toString(),
                                role: 'tutor',
                                text: iText,
                                timestamp: new Date(),
                                type: 'intro'
                            };
                            const initialHistory = [iMsg];
                            setSession(prev => {
                                if (!prev) return null;
                                const newConcepts = [...prev.concepts];
                                newConcepts[nextIndex] = {
                                    ...newConcepts[nextIndex],
                                    introContent: intro,
                                    suggestedProblems: intro.problems,
                                    problemSessions: { '__intro__': initialHistory }
                                };
                                return {
                                    ...prev,
                                    concepts: newConcepts,
                                    dialogHistory: initialHistory
                                };
                            });
                        }
                        setIsThinking(false);
                    }
                }
            } else {
                if (currentConceptIndexRef.current === startIndex) {
                    setSession({ ...session, concepts: finalizedConcepts, isComplete: true });
                    setIsThinking(false);
                }
            }
        } else {
            const intermediateSupportLevel = evaluation.action === 'increase_support'
                ? Math.min(4, session.supportLevel + 1) as 1 | 2 | 3 | 4
                : session.supportLevel;

            const intermediateSession = {
                ...updatedSession,
                supportLevel: intermediateSupportLevel
            };

            let fullResponse = '';
            await generateSocraticQuestion(intermediateSession, mode, (chunk) => {
                if (currentConceptIndexRef.current === startIndex) {
                    fullResponse += chunk;
                    setCurrentTutorMessage(fullResponse);
                }
            });

            if (currentConceptIndexRef.current !== startIndex) return;

            const tutorMessage: LearningMessage = {
                id: Date.now().toString(),
                role: 'tutor',
                text: fullResponse,
                timestamp: new Date(),
                type: 'question'
            };

            setSession({
                ...intermediateSession,
                dialogHistory: [...intermediateSession.dialogHistory, tutorMessage]
            });
            setCurrentTutorMessage('');
            setIsThinking(false);
        }
    };

    const handleSolveStepByStep = async () => {
        if (!session || isThinking) return;
        const currentConcept = session.concepts[session.currentConceptIndex];
        const activeProblem = currentConcept.suggestedProblems?.find(p => p.id === currentConcept.activeProblemId);

        if (!activeProblem) return;

        const startIndex = session.currentConceptIndex;
        setIsThinking(true);
        setCurrentTutorMessage("");

        try {
            let fullSolutionText = '';

            await generateStepByStepSolution(
                currentConcept.title,
                activeProblem,
                session.dialogHistory,
                mode,
                (chunk) => {
                    if (currentConceptIndexRef.current === startIndex) {
                        fullSolutionText += chunk;
                        setCurrentTutorMessage(fullSolutionText);
                    }
                }
            );

            if (currentConceptIndexRef.current !== startIndex) return;

            const solutionMessage: LearningMessage = {
                id: Date.now().toString(),
                role: 'tutor',
                text: fullSolutionText,
                timestamp: new Date(),
                type: 'solution'
            };

            const updatedHistory = [...session.dialogHistory, solutionMessage];

            const updatedConcepts = [...session.concepts];
            updatedConcepts[startIndex] = {
                ...currentConcept,
                problemSessions: {
                    ...(currentConcept.problemSessions || {}),
                    [currentConcept.activeProblemId || '__intro__']: updatedHistory
                }
            };

            setSession({
                ...session,
                concepts: updatedConcepts,
                dialogHistory: updatedHistory
            });

            // Auto-save solution to file
            if (directoryHandle) {
                try {
                    const parentPath = getParentFolderPath(noteId);
                    let currentHandle: FileSystemDirectoryHandle = directoryHandle;
                    for (const folderName of parentPath) {
                        currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
                    }
                    const exerciciosHandle = await currentHandle.getDirectoryHandle('exercicios', { create: true });
                    const fileName = `${sanitizeFileName(currentConcept.title)}_${sanitizeFileName(activeProblem.title)}.md`;

                    const markdownContent = `# ${activeProblem.title}\n\n**Conceito:** ${currentConcept.title}\n**Dificuldade:** ${activeProblem.difficulty}\n**Foco:** ${activeProblem.focus}\n\n---\n\n## Problema\n\n${activeProblem.description}\n\n---\n\n## Solução\n\n${fullSolutionText}\n`;

                    const fileHandle = await exerciciosHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(markdownContent);
                    await writable.close();
                    console.log(`Solution saved to exercicios/${fileName}`);
                } catch (saveError) {
                    console.error('Error saving solution:', saveError);
                }
            }
        } catch (error) {
            console.error("Error generating solution:", error);
        } finally {
            if (currentConceptIndexRef.current === startIndex) {
                setIsThinking(false);
                setCurrentTutorMessage("");
            }
        }
    };

    const handleSwitchConcept = async (newIndex: number) => {
        if (!session) return;
        if (newIndex < 0 || newIndex >= session.concepts.length) return;
        if (newIndex === session.currentConceptIndex) return;

        const currentConcept = session.concepts[session.currentConceptIndex];
        const updatedConcepts = [...session.concepts];

        const activeId = currentConcept.activeProblemId || '__intro__';
        const updatedProblemSessions = {
            ...(currentConcept.problemSessions || {}),
            [activeId]: session.dialogHistory
        };

        updatedConcepts[session.currentConceptIndex] = {
            ...currentConcept,
            supportLevel: session.supportLevel,
            introContent: introContent || undefined,
            suggestedProblems: suggestedProblems,
            problemSessions: updatedProblemSessions
        };

        const targetConcept = updatedConcepts[newIndex];

        const targetActiveId = targetConcept.activeProblemId || '__intro__';
        const targetHistory = targetConcept.problemSessions?.[targetActiveId] || [];

        setSession({
            ...session,
            concepts: updatedConcepts,
            currentConceptIndex: newIndex,
            dialogHistory: targetHistory,
            supportLevel: targetConcept.supportLevel || 1
        });

        setIntroContent(targetConcept.introContent || null);
        setSuggestedProblems(targetConcept.suggestedProblems || []);
        setShowProblemSelector(false);
        setComplexityLevel(1);
        setCurrentTutorMessage('');
        setIsThinking(false);

        if (!targetConcept.introContent) {
            setIsThinking(true);
            if (!pregeneratingIndices.has(newIndex)) {
                const intro = await generateIntroduction(targetConcept.title, targetConcept.description, mode);

                if (currentConceptIndexRef.current !== newIndex) return;

                if (intro) {
                    setIntroContent(intro);
                    setSuggestedProblems(intro.problems);

                    const introText = `## Definição Formal\n\n${intro.formalDefinition}\n\n## Intuição\n\n${intro.intuition}\n\nEscolha um dos problemas abaixo para começarmos:`;

                    const tutorMessage: LearningMessage = {
                        id: Date.now().toString(),
                        role: 'tutor',
                        text: introText,
                        timestamp: new Date(),
                        type: 'intro'
                    };

                    const initialHistory = [tutorMessage];

                    setSession(prev => {
                        if (!prev) return null;
                        const newConcepts = [...prev.concepts];
                        newConcepts[newIndex] = {
                            ...newConcepts[newIndex],
                            introContent: intro,
                            suggestedProblems: intro.problems,
                            problemSessions: { '__intro__': initialHistory }
                        };
                        return {
                            ...prev,
                            concepts: newConcepts,
                            dialogHistory: initialHistory
                        };
                    });
                } else {
                    let fullResponse = '';
                    const tempSession: LearningSession = {
                        ...session,
                        currentConceptIndex: newIndex,
                        dialogHistory: [],
                        supportLevel: 1 as 1 | 2 | 3 | 4
                    };

                    await generateSocraticQuestion(tempSession, mode, (chunk) => {
                        if (currentConceptIndexRef.current === newIndex) {
                            fullResponse += chunk;
                            setCurrentTutorMessage(fullResponse);
                        }
                    });

                    if (currentConceptIndexRef.current !== newIndex) return;

                    const tutorMessage: LearningMessage = {
                        id: Date.now().toString(),
                        role: 'tutor',
                        text: fullResponse,
                        timestamp: new Date(),
                        type: 'intro'
                    };

                    const fallbackHistory = [tutorMessage];

                    setSession(prev => {
                        if (!prev) return null;
                        const newConcepts = [...prev.concepts];
                        newConcepts[newIndex] = {
                            ...newConcepts[newIndex],
                            problemSessions: { '__intro__': fallbackHistory }
                        };
                        return {
                            ...prev,
                            concepts: newConcepts,
                            dialogHistory: fallbackHistory
                        };
                    });
                    setCurrentTutorMessage('');
                }
                setIsThinking(false);
            }
        }
    };

    const handleSkipConcept = () => {
        if (!session) return;
        handleSwitchConcept(session.currentConceptIndex + 1);
    };

    const handlePreviousConcept = () => {
        if (!session) return;
        handleSwitchConcept(session.currentConceptIndex - 1);
    };

    const handleIncreaseComplexity = async () => {
        if (!session || isThinking || complexityLevel >= 3) return;

        const startIndex = session.currentConceptIndex;
        const newLevel = (complexityLevel + 1) as 1 | 2 | 3;
        setComplexityLevel(newLevel);
        setIsThinking(true);

        const currentConcept = session.concepts[session.currentConceptIndex];
        const levelNames = { 1: 'básico', 2: 'intermediário', 3: 'avançado' };

        let fullResponse = '';
        const advancedPrompt = `O estudante solicitou uma explicação mais avançada (nível ${levelNames[newLevel]}) sobre "${currentConcept.title}".

INSTRUÇÃO: Forneça uma abordagem mais ${newLevel === 2 ? 'técnica com exemplos de maior dimensão ou complexidade' : 'rigorosa com generalizações, provas formais e casos limite'}. 
- Use exemplos mais desafiadores
- Explore conexões com outros conceitos avançados
- Se apropriado, mencione aplicações em contextos mais sofisticados
- Termine com uma pergunta que teste compreensão mais profunda

Use LaTeX para todas expressões matemáticas.`;

        const advancedSession = {
            ...session,
            dialogHistory: [...session.dialogHistory, {
                id: 'system',
                role: 'student' as const,
                text: advancedPrompt,
                timestamp: new Date(),
                type: 'answer' as const
            }]
        };

        await generateSocraticQuestion(advancedSession, mode, (chunk) => {
            if (currentConceptIndexRef.current === startIndex) {
                fullResponse += chunk;
                setCurrentTutorMessage(fullResponse);
            }
        });

        if (currentConceptIndexRef.current !== startIndex) return;

        const tutorMessage: LearningMessage = {
            id: Date.now().toString(),
            role: 'tutor',
            text: fullResponse,
            timestamp: new Date(),
            type: 'question'
        };

        setSession(prev => prev ? {
            ...prev,
            dialogHistory: [...prev.dialogHistory, tutorMessage]
        } : null);

        setCurrentTutorMessage('');
        setIsThinking(false);
    };

    const handleSelectProblem = async (problem: SuggestedProblem) => {
        if (!session || isThinking) return;
        const currentConcept = session.concepts[session.currentConceptIndex];

        if (currentConcept.activeProblemId === problem.id) {
            setShowProblemSelector(false);
            return;
        }

        const startIndex = session.currentConceptIndex;

        const activeId = currentConcept.activeProblemId || '__intro__';
        const updatedProblemSessions = {
            ...(currentConcept.problemSessions || {}),
            [activeId]: session.dialogHistory
        };

        const savedHistory = updatedProblemSessions[problem.id] || [];

        const updatedConcepts = [...session.concepts];
        updatedConcepts[startIndex] = {
            ...currentConcept,
            activeProblemId: problem.id,
            problemSessions: updatedProblemSessions
        };

        setSession({
            ...session,
            concepts: updatedConcepts,
            dialogHistory: savedHistory
        });

        setShowProblemSelector(false);

        if (savedHistory.length === 0) {
            const studentMessage: LearningMessage = {
                id: Date.now().toString(),
                role: 'student',
                text: `Quero explorar: ${problem.title}`,
                timestamp: new Date(),
                type: 'answer'
            };

            const updatedSession = {
                ...session,
                concepts: updatedConcepts,
                dialogHistory: [studentMessage]
            };
            setSession(updatedSession);
            setIsThinking(true);

            let fullResponse = '';
            await generateSocraticQuestion({
                ...updatedSession,
                dialogHistory: [{
                    id: 'context',
                    role: 'student' as const,
                    text: `O estudante escolheu explorar o problema: "${problem.title}"\n\nDescrição do problema:\n${problem.description}\n\nFoco: ${problem.focus}\nDificuldade: ${problem.difficulty}\n\nInicie a exploração socrática deste problema específico. Comece com uma pergunta que guie o estudante ao primeiro passo da resolução.`,
                    timestamp: new Date(),
                    type: 'answer' as const
                }]
            }, mode, (chunk) => {
                if (currentConceptIndexRef.current === startIndex) {
                    fullResponse += chunk;
                    setCurrentTutorMessage(fullResponse);
                }
            });

            if (currentConceptIndexRef.current !== startIndex) return;

            const tutorMessage: LearningMessage = {
                id: (Date.now() + 1).toString(),
                role: 'tutor',
                text: fullResponse,
                timestamp: new Date(),
                type: 'question'
            };

            setSession(prev => {
                if (!prev) return null;
                const newHistory = [...prev.dialogHistory, tutorMessage];
                const newConcepts = [...prev.concepts];
                newConcepts[startIndex] = {
                    ...newConcepts[startIndex],
                    problemSessions: {
                        ...(newConcepts[startIndex].problemSessions || {}),
                        [problem.id]: newHistory
                    }
                };
                return {
                    ...prev,
                    concepts: newConcepts,
                    dialogHistory: newHistory
                };
            });

            setCurrentTutorMessage('');
            setIsThinking(false);
        }
    };

    const currentConcept = session?.concepts[session.currentConceptIndex];
    const activeProblem = currentConcept?.activeProblemId
        ? suggestedProblems.find(p => p.id === currentConcept.activeProblemId)
        : undefined;

    // Render suggested problems component
    const renderSuggestedProblems = () => (
        <SuggestedProblems
            problems={suggestedProblems}
            activeProblemId={currentConcept?.activeProblemId}
            problemSessions={currentConcept?.problemSessions}
            isThinking={isThinking}
            onSelectProblem={handleSelectProblem}
        />
    );

    // Loading state
    if (isLoading) {
        return <LoadingState />;
    }

    // Error state
    if (!session) {
        return <ErrorState onClose={onClose} />;
    }

    // Completed state
    if (session.isComplete) {
        return <CompletedState noteName={noteName} onClose={onClose} />;
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-lg overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                            <i className="fa-solid fa-graduation-cap text-white"></i>
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">Modo Aprendizado</h2>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{noteName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowProblemSelector(!showProblemSelector)}
                            className={`px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-1.5 ${showProblemSelector ? 'ring-2 ring-indigo-200' : ''}`}
                        >
                            <i className="fa-solid fa-list-ul"></i>
                            {showProblemSelector ? 'Ver Diálogo' : 'Trocar Problema'}
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            title="Encerrar sessão"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <ConceptNavigator
                    session={session}
                    currentConcept={currentConcept}
                    suggestedProblems={suggestedProblems}
                    showProblemSelector={showProblemSelector}
                    isThinking={isThinking}
                    onSwitchConcept={handleSwitchConcept}
                    onSelectProblem={handleSelectProblem}
                    onToggleProblemSelector={() => setShowProblemSelector(true)}
                />
            </div>

            {/* Messages or Problem Selector */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" ref={scrollRef}>
                {showProblemSelector ? (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="mb-6 text-center">
                            <h3 className="text-lg font-bold text-indigo-900">Seletor de Exercícios</h3>
                            <p className="text-sm text-gray-500">Escolha um problema para focar agora. Seu progresso em cada um será salvo.</p>
                        </div>
                        {renderSuggestedProblems()}
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => setShowProblemSelector(false)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all text-sm font-medium"
                            >
                                Voltar para o Diálogo
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Concept Introduction */}
                        {introContent && <ConceptIntroduction introContent={introContent} />}

                        {/* Active Problem Statement */}
                        {activeProblem && <ActiveProblemStatement problem={activeProblem} />}

                        {/* Message List */}
                        <MessageList
                            messages={session.dialogHistory}
                            currentTutorMessage={currentTutorMessage}
                            isThinking={isThinking}
                            renderSuggestedProblems={renderSuggestedProblems}
                            hasActiveProblem={!!currentConcept?.activeProblemId}
                        />
                    </>
                )}
            </div>

            {/* Input Area */}
            <InputArea
                session={session}
                input={input}
                isThinking={isThinking}
                complexityLevel={complexityLevel}
                hasActiveProblem={!!currentConcept?.activeProblemId}
                onInputChange={setInput}
                onSend={handleSend}
                onSolveStepByStep={handleSolveStepByStep}
                onPreviousConcept={handlePreviousConcept}
                onSkipConcept={handleSkipConcept}
                onIncreaseComplexity={handleIncreaseComplexity}
            />
        </div>
    );
};

export default LearningMode;
