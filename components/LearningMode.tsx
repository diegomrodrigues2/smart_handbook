import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { LearningSession, LearningMessage, SuggestedProblem, IntroductionContent } from '../types';
import {
    createLearningSession,
    generateSocraticQuestion,
    evaluateStudentResponse,
    generateIntroduction,
    generateStepByStepSolution
} from '../services/learningModeService';

interface LearningModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    onClose: () => void;
}

const LearningMode: React.FC<LearningModeProps> = ({ noteContent, noteName, noteId, onClose }) => {
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
            const newSession = await createLearningSession(noteId, noteName, noteContent);
            if (newSession) {
                setSession(newSession);
                // Generate first question
                await generateFirstQuestion(newSession);
            }
            setIsLoading(false);
        };
        init();
    }, [noteId, noteName, noteContent]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session?.dialogHistory, currentTutorMessage]);

    const generateFirstQuestion = async (sess: LearningSession) => {
        setIsThinking(true);

        const currentConcept = sess.concepts[sess.currentConceptIndex];
        if (!currentConcept) {
            setIsThinking(false);
            return;
        }

        // Use structured output for introduction
        const intro = await generateIntroduction(currentConcept.title, currentConcept.description);

        if (intro) {
            setIntroContent(intro);
            setSuggestedProblems(intro.problems);

            // Create intro message (without problems - they'll be rendered separately)
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
            // Fallback to streaming if structured output fails
            let fullResponse = '';
            await generateSocraticQuestion(sess, (chunk) => {
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

        // Evaluate response
        const currentConcept = session.concepts[session.currentConceptIndex];
        const evaluation = await evaluateStudentResponse(currentConcept, input);

        const startIndex = session.currentConceptIndex;

        // Generate next tutor message
        if (evaluation.action === 'advance') {
            const activeId = currentConcept.activeProblemId || '__intro__';
            const updatedProblemSessions = {
                ...(currentConcept.problemSessions || {}),
                [activeId]: updatedSession.dialogHistory
            };

            // Save current concept's finalized state
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

            // Move to next concept
            if (session.currentConceptIndex + 1 < session.concepts.length) {
                const nextIndex = session.currentConceptIndex + 1;
                const nextTargetConcept = finalizedConcepts[nextIndex];

                // Load target concept state
                const targetActiveId = nextTargetConcept.activeProblemId || '__intro__';
                const targetHistory = nextTargetConcept.problemSessions?.[targetActiveId] || [];

                // Update session state for transition
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

                // If next concept is new, generate intro
                if (!nextTargetConcept.introContent) {
                    setIsThinking(true);
                    const intro = await generateIntroduction(nextTargetConcept.title, nextTargetConcept.description);

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
            } else {
                if (currentConceptIndexRef.current === startIndex) {
                    setSession({ ...session, concepts: finalizedConcepts, isComplete: true });
                    setIsThinking(false);
                }
            }
        } else {
            // No advancement, just generate tutor response for current concept
            const intermediateSupportLevel = evaluation.action === 'increase_support'
                ? Math.min(4, session.supportLevel + 1) as 1 | 2 | 3 | 4
                : session.supportLevel;

            const intermediateSession = {
                ...updatedSession,
                supportLevel: intermediateSupportLevel
            };

            let fullResponse = '';
            await generateSocraticQuestion(intermediateSession, (chunk) => {
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

            // Update session state
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
        } catch (error) {
            console.error("Error generating solution:", error);
        } finally {
            if (currentConceptIndexRef.current === startIndex) {
                setIsThinking(false);
                setCurrentTutorMessage("");
            }
        }
    };

    // Switch to a different concept, saving current progress
    const handleSwitchConcept = async (newIndex: number) => {
        if (!session) return;
        if (newIndex < 0 || newIndex >= session.concepts.length) return;
        if (newIndex === session.currentConceptIndex) return;

        // Save current concept state
        const currentConcept = session.concepts[session.currentConceptIndex];
        const updatedConcepts = [...session.concepts];

        // Save current active session history
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

        // Load target concept's active problem history
        const targetActiveId = targetConcept.activeProblemId || '__intro__';
        const targetHistory = targetConcept.problemSessions?.[targetActiveId] || [];

        // Update session state
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

        // If concept has no intro content, initialize it
        if (!targetConcept.introContent) {
            setIsThinking(true);
            const intro = await generateIntroduction(targetConcept.title, targetConcept.description);

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
                // Fallback to streaming
                let fullResponse = '';
                const tempSession: LearningSession = {
                    ...session,
                    currentConceptIndex: newIndex,
                    dialogHistory: [],
                    supportLevel: 1 as 1 | 2 | 3 | 4
                };

                await generateSocraticQuestion(tempSession, (chunk) => {
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

        // Generate advanced explanation
        let fullResponse = '';
        const advancedPrompt = `O estudante solicitou uma explicação mais avançada (nível ${levelNames[newLevel]}) sobre "${currentConcept.title}".

INSTRUÇÃO: Forneça uma abordagem mais ${newLevel === 2 ? 'técnica com exemplos de maior dimensão ou complexidade' : 'rigorosa com generalizações, provas formais e casos limite'}. 
- Use exemplos mais desafiadores
- Explore conexões com outros conceitos avançados
- Se apropriado, mencione aplicações em contextos mais sofisticados
- Termine com uma pergunta que teste compreensão mais profunda

Use LaTeX para todas expressões matemáticas.`;

        const { generateSocraticQuestion } = await import('../services/learningModeService');

        // Create a temporary session with the advanced context in history
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

        await generateSocraticQuestion(advancedSession, (chunk) => {
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

    const currentConcept = session?.concepts[session.currentConceptIndex];
    const progress = session ? (session.currentConceptIndex / session.concepts.length) * 100 : 0;

    // Handle problem selection (using structured data)
    const handleSelectProblem = async (problem: SuggestedProblem) => {
        if (!session || isThinking) return;
        const currentConcept = session.concepts[session.currentConceptIndex];

        // If already active, just close selector
        if (currentConcept.activeProblemId === problem.id) {
            setShowProblemSelector(false);
            return;
        }

        const startIndex = session.currentConceptIndex;

        // Save current history to the current active session (intro or other problem)
        const activeId = currentConcept.activeProblemId || '__intro__';
        const updatedProblemSessions = {
            ...(currentConcept.problemSessions || {}),
            [activeId]: session.dialogHistory
        };

        // Check if we already have history for the new problem
        const savedHistory = updatedProblemSessions[problem.id] || [];

        // Update session state
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

        // If no history, trigger introductory prompt
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

            // Generate response for selected problem
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
            }, (chunk) => {
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
                // Update persistent storage
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

    // Render message content
    const renderMessageContent = (msg: LearningMessage) => {
        return (
            <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {msg.text}
                </ReactMarkdown>
            </div>
        );
    };

    // Render suggested problems as clickable cards
    const renderSuggestedProblems = () => {
        if (suggestedProblems.length === 0) return null;

        const focusLabels = {
            algebraic: { label: 'Algébrico', color: 'bg-blue-100 text-blue-700' },
            geometric: { label: 'Geométrico', color: 'bg-green-100 text-green-700' },
            computational: { label: 'Computacional', color: 'bg-orange-100 text-orange-700' },
            theoretical: { label: 'Teórico', color: 'bg-purple-100 text-purple-700' }
        };

        const difficultyLabels = {
            basic: { label: 'Básico', color: 'text-green-600' },
            intermediate: { label: 'Intermediário', color: 'text-yellow-600' },
            advanced: { label: 'Avançado', color: 'text-red-600' }
        };

        const activeId = session?.concepts[session.currentConceptIndex].activeProblemId;

        return (
            <div className="mt-4 space-y-3">
                <div className="text-xs font-semibold text-indigo-600 mb-3 flex items-center gap-1">
                    <i className="fa-solid fa-layer-group"></i>
                    Explorar Problemas:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestedProblems.map((problem, idx) => {
                        const isActive = activeId === problem.id;
                        const hasHistory = session?.concepts[session.currentConceptIndex].problemSessions?.[problem.id];

                        return (
                            <button
                                key={problem.id || idx}
                                onClick={() => handleSelectProblem(problem)}
                                disabled={isThinking && !isActive}
                                className={`text-left p-3 rounded-xl border transition-all group relative overflow-hidden ${isActive
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500 text-white shadow-lg scale-[1.02]'
                                    : 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-start gap-2 relative z-10">
                                    <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${isActive ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                            <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-indigo-800'}`}>
                                                {problem.title}
                                            </span>
                                            {hasHistory && !isActive && (
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Retomar</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : focusLabels[problem.focus].color}`}>
                                                {focusLabels[problem.focus].label}
                                            </span>
                                            <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : difficultyLabels[problem.difficulty].color}`}>
                                                {difficultyLabels[problem.difficulty].label}
                                            </span>
                                        </div>
                                        <div className={`text-xs leading-relaxed ${isActive ? 'text-indigo-50' : 'text-gray-500 line-clamp-2'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {problem.description}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                    <i className={`fa-solid ${isActive ? 'fa-circle-check text-white' : 'fa-chevron-right text-indigo-300 group-hover:text-indigo-500'} mt-1 transition-colors`}></i>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center animate-pulse">
                        <i className="fa-solid fa-graduation-cap text-2xl text-white"></i>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Preparando Modo Aprendizado</h2>
                    <p className="text-gray-500 text-sm">Analisando conceitos da nota...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
                <div className="text-center">
                    <i className="fa-solid fa-exclamation-circle text-4xl text-red-400 mb-4"></i>
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">Não foi possível iniciar</h2>
                    <p className="text-gray-500 text-sm mb-4">Não conseguimos extrair conceitos desta nota.</p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    if (session.isComplete) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                        <i className="fa-solid fa-trophy text-3xl text-white"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Parabéns! 🎉</h2>
                    <p className="text-gray-600 mb-6">
                        Você completou todos os conceitos de <strong>{noteName}</strong>!
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-md"
                        >
                            Concluir
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

                {/* Progress Bar */}
                <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso</span>
                        <span>{session.currentConceptIndex}/{session.concepts.length} conceitos</span>
                    </div>
                    <div className="h-2 bg-indigo-100 rounded-full overflow-hidden flex gap-0.5">
                        {session.concepts.map((c, i) => (
                            <button
                                key={c.id}
                                onClick={() => handleSwitchConcept(i)}
                                className={`h-full transition-all duration-300 ${i === session.currentConceptIndex
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                    : c.completed
                                        ? 'bg-indigo-300'
                                        : 'bg-indigo-100 hover:bg-indigo-200'
                                    }`}
                                style={{ width: `${100 / session.concepts.length}%` }}
                                title={c.title}
                            />
                        ))}
                    </div>
                </div>

                {/* Current Concept & Problem Switcher */}
                {currentConcept && (
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-3 border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fa-solid fa-lightbulb text-amber-500 text-sm"></i>
                            <span className="text-xs font-semibold text-indigo-700">Conceito Atual</span>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                                Suporte: {session.supportLevel}/4
                            </span>
                        </div>
                        <h3 className="font-semibold text-gray-800 leading-tight mb-1">{currentConcept.title}</h3>
                        <p className="text-xs text-gray-600 truncate mb-3">{currentConcept.description}</p>

                        {/* Persistent Mini Switcher */}
                        {suggestedProblems.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-200/50">
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter mr-1">Exercícios:</span>
                                {suggestedProblems.map((prob, idx) => {
                                    const isActive = currentConcept.activeProblemId === prob.id;
                                    const hasHistory = currentConcept.problemSessions?.[prob.id];

                                    return (
                                        <button
                                            key={prob.id}
                                            onClick={() => handleSelectProblem(prob)}
                                            disabled={isThinking && !isActive}
                                            title={prob.title}
                                            className={`h-7 px-3 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${isActive
                                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                                                : 'bg-white border border-indigo-100 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50'
                                                }`}
                                        >
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${isActive ? 'bg-white/20' : 'bg-indigo-100'}`}>
                                                {idx + 1}
                                            </span>
                                            <span className="max-w-[80px] truncate">{prob.title}</span>
                                            {hasHistory && !isActive && <div className="w-1 h-1 rounded-full bg-green-500"></div>}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setShowProblemSelector(true)}
                                    className="ml-auto text-[10px] text-indigo-500 hover:text-indigo-700 font-bold hover:underline"
                                >
                                    Ver Banco Completo
                                </button>
                            </div>
                        )}
                    </div>
                )}
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
                        {/* Concept Introduction - Always visible at the top of the concept discussion */}
                        {introContent && (
                            <div className="mb-8 p-6 bg-white rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <i className="fa-solid fa-microchip text-4xl text-indigo-600"></i>
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <i className="fa-solid fa-book-open text-sm"></i>
                                    </div>
                                    <h4 className="font-bold text-indigo-900">Fundamentos do Conceito</h4>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                            <span className="w-4 h-px bg-indigo-100"></span>
                                            Definição Formal
                                        </div>
                                        <div className="prose prose-sm max-w-none text-gray-800 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {introContent.formalDefinition}
                                            </ReactMarkdown>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                                            <span className="w-4 h-px bg-purple-100"></span>
                                            Intuição Matemática
                                        </div>
                                        <div className="prose prose-sm max-w-none text-gray-800 bg-purple-50/30 p-3 rounded-xl border border-purple-100/50">
                                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                {introContent.intuition}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Active Problem Statement - Persistent statement of the current challenge */}
                        {currentConcept?.activeProblemId && (
                            <div className="mb-6 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <i className="fa-solid fa-pen-to-square text-xs"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <h5 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Desafio Atual</h5>
                                        <h4 className="font-bold text-emerald-900">
                                            {suggestedProblems.find(p => p.id === currentConcept.activeProblemId)?.title}
                                        </h4>
                                    </div>
                                </div>
                                <div className="prose prose-sm max-w-none text-emerald-900/80 italic bg-white/40 p-3 rounded-lg border border-emerald-100/50">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                        {suggestedProblems.find(p => p.id === currentConcept.activeProblemId)?.description || ''}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {session.dialogHistory.filter(msg => msg.type !== 'intro').map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'student'
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md'
                                        : 'bg-white text-gray-800 border border-indigo-100 rounded-bl-md'
                                        }`}
                                >
                                    {msg.role === 'tutor' && (
                                        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-indigo-600">
                                            <i className="fa-solid fa-chalkboard-user"></i>
                                            <span>Tutor</span>
                                            {msg.type === 'hint' && (
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">
                                                    <i className="fa-solid fa-lightbulb mr-1"></i>Dica
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {renderMessageContent(msg)}
                                </div>
                            </div>
                        ))}

                        {/* Suggested Problems (only if no active problem chosen yet) */}
                        {!currentConcept?.activeProblemId && renderSuggestedProblems()}

                        {/* Streaming message */}
                        {currentTutorMessage && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] rounded-2xl rounded-bl-md p-4 bg-white text-gray-800 border border-indigo-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-medium text-indigo-600">
                                        <i className="fa-solid fa-chalkboard-user animate-pulse"></i>
                                        <span>Tutor</span>
                                    </div>
                                    <div className="prose prose-sm max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {currentTutorMessage}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Thinking indicator */}
                        {isThinking && !currentTutorMessage && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-bl-md p-4 border border-indigo-100 shadow-sm">
                                    <div className="flex items-center gap-2 text-indigo-500">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                        <span className="text-sm">Pensando...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-white/80 backdrop-blur-sm border-t border-indigo-100 p-4">
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={handleSolveStepByStep}
                        disabled={isThinking || !currentConcept?.activeProblemId}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${!currentConcept?.activeProblemId
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                    >
                        <i className="fa-solid fa-list-check"></i>
                        Resolver Passo a Passo
                    </button>
                    <button
                        onClick={handlePreviousConcept}
                        disabled={session.currentConceptIndex === 0}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${session.currentConceptIndex === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            }`}
                    >
                        <i className="fa-solid fa-backward"></i>
                        Conceito Anterior
                    </button>
                    <button
                        onClick={handleSkipConcept}
                        disabled={session.currentConceptIndex === session.concepts.length - 1}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${session.currentConceptIndex === session.concepts.length - 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                    >
                        <i className="fa-solid fa-forward"></i>
                        Próximo Conceito
                    </button>
                    <button
                        onClick={handleIncreaseComplexity}
                        disabled={isThinking || complexityLevel >= 3}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${complexityLevel >= 3
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                        title="Aumentar complexidade dos exemplos"
                    >
                        <i className="fa-solid fa-arrow-up"></i>
                        Mais Avançado
                    </button>
                    <div className="flex-1"></div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <i className="fa-solid fa-chart-line"></i>
                            Suporte: {session.supportLevel}/4
                        </span>
                        <span className="text-purple-500 flex items-center gap-1">
                            <i className="fa-solid fa-layer-group"></i>
                            Nível: {complexityLevel === 1 ? 'Básico' : complexityLevel === 2 ? 'Intermediário' : 'Avançado'}
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        className="w-full resize-none border border-indigo-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white/50"
                        rows={2}
                        placeholder="Digite sua resposta..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={isThinking}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isThinking || !input.trim()}
                        className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${input.trim() && !isThinking
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md'
                            : 'bg-gray-200 text-gray-400'
                            }`}
                    >
                        <i className="fa-solid fa-paper-plane text-sm"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LearningMode;
