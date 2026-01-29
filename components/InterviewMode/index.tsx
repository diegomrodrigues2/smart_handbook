import React, { useState, useEffect, useRef } from 'react';
import { InterviewSession, InterviewMessage, InterviewQuestion } from '../../types';
import {
    startInterviewSession,
    getInterviewerResponse,
    evaluateCandidateResponse,
    generateFinalVerdict,
    generateInterviewTranscript,
    generateModelAnswer
} from '../../services/interviewService';
import { transcribeAudio } from '../../services/audioService';
import MessageList from './MessageList';
import QuestionProgress from './QuestionProgress';
import EvaluationCard from './EvaluationCard';
import FinalVerdict from './FinalVerdict';

interface InterviewModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
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
    const parts = noteId.split(/[\\/]/);
    if (parts.length >= 3) {
        return parts.slice(1, -2);
    }
    return parts.slice(1, -1);
};

const InterviewMode: React.FC<InterviewModeProps> = ({
    noteContent,
    noteName,
    noteId,
    directoryHandle,
    onClose,
    pdfData
}) => {
    const [session, setSession] = useState<InterviewSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isSolving, setIsSolving] = useState(false);
    const [isSolvingAll, setIsSolvingAll] = useState(false);
    const [currentStreamingText, setCurrentStreamingText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ url: string, base64: string, mimeType: string } | null>(null);
    const [showEvaluation, setShowEvaluation] = useState(false);
    const [modelAnswerText, setModelAnswerText] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);
    const currentQuestionIndexRef = useRef(0);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
            };
            reader.readAsDataURL(blob);
        });
    };

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const init = async () => {
            setLoading(true);
            const newSession = await startInterviewSession(
                noteId,
                noteName,
                noteContent,
                pdfData || undefined
            );
            if (newSession) {
                setSession(newSession);
                // Start interview with first question
                await presentCurrentQuestion(newSession);
            }
            setLoading(false);
        };
        init();
    }, [noteId, noteName, noteContent, pdfData]);

    useEffect(() => {
        if (session) {
            currentQuestionIndexRef.current = session.currentQuestionIndex;
        }
    }, [session?.currentQuestionIndex]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session?.messages, currentStreamingText, modelAnswerText]);

    const presentCurrentQuestion = async (sessionState: InterviewSession) => {
        const currentQuestion = sessionState.questions[sessionState.currentQuestionIndex];
        if (!currentQuestion) return;

        // Check if this question already has messages
        const existingMessages = sessionState.messages.filter(m => m.questionId === currentQuestion.id);
        if (existingMessages.length > 0) {
            // Question already presented, no need to regenerate
            return;
        }

        setIsGenerating(true);
        setCurrentStreamingText('');

        let fullResponse = '';
        const introId = Date.now().toString();
        const startIndex = sessionState.currentQuestionIndex;

        await getInterviewerResponse(
            sessionState,
            noteContent,
            (chunk) => {
                if (currentQuestionIndexRef.current === startIndex) {
                    fullResponse += chunk;
                    setCurrentStreamingText(fullResponse);
                }
            },
            undefined,
            pdfData || undefined
        );

        if (currentQuestionIndexRef.current !== startIndex) return;

        const interviewerMsg: InterviewMessage = {
            id: introId,
            role: 'interviewer',
            text: fullResponse,
            timestamp: new Date(),
            questionId: currentQuestion.id
        };

        setSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                messages: [...prev.messages, interviewerMsg]
            };
        });

        setCurrentStreamingText('');
        setIsGenerating(false);
    };

    const handleSendMessage = async () => {
        const text = inputValue.trim();
        if (!text && !pendingImage) return;
        if (!session || isGenerating || isEvaluating || isSolving) return;

        const currentQuestion = session.questions[session.currentQuestionIndex];

        const candidateMsg: InterviewMessage = {
            id: Date.now().toString(),
            role: 'candidate',
            text: text || (pendingImage ? "[Imagem anexada]" : ""),
            timestamp: new Date(),
            questionId: currentQuestion.id,
            imageUrl: pendingImage?.url
        };

        const imagePart = pendingImage ? { mimeType: pendingImage.mimeType, data: pendingImage.base64 } : undefined;

        // Update candidate response for evaluation
        const updatedQuestions = [...session.questions];
        const existingResponse = updatedQuestions[session.currentQuestionIndex].candidateResponse || '';
        updatedQuestions[session.currentQuestionIndex] = {
            ...updatedQuestions[session.currentQuestionIndex],
            candidateResponse: existingResponse + (existingResponse ? '\n' : '') + text
        };

        const updatedSession: InterviewSession = {
            ...session,
            questions: updatedQuestions,
            messages: [...session.messages, candidateMsg]
        };

        setSession(updatedSession);
        setInputValue('');
        setPendingImage(null);
        setIsGenerating(true);
        setCurrentStreamingText('');

        let fullResponse = '';
        const responseId = (Date.now() + 1).toString();
        const startIndex = session.currentQuestionIndex;

        await getInterviewerResponse(
            updatedSession,
            noteContent,
            (chunk) => {
                if (currentQuestionIndexRef.current === startIndex) {
                    fullResponse += chunk;
                    setCurrentStreamingText(fullResponse);
                }
            },
            imagePart,
            pdfData || undefined
        );

        if (currentQuestionIndexRef.current !== startIndex) return;

        const interviewerMsg: InterviewMessage = {
            id: responseId,
            role: 'interviewer',
            text: fullResponse,
            timestamp: new Date(),
            questionId: currentQuestion.id
        };

        setSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                messages: [...prev.messages, interviewerMsg]
            };
        });

        setCurrentStreamingText('');
        setIsGenerating(false);
    };

    const handleSubmitAnswer = async () => {
        if (!session || isGenerating || isEvaluating || isSolving) return;

        const currentQuestion = session.questions[session.currentQuestionIndex];
        if (!currentQuestion.candidateResponse) {
            alert('Por favor, responda a pergunta antes de submeter.');
            return;
        }

        setIsEvaluating(true);

        // Evaluate the response
        const evaluation = await evaluateCandidateResponse(session, currentQuestion.candidateResponse);

        if (evaluation) {
            const updatedQuestions = [...session.questions];
            updatedQuestions[session.currentQuestionIndex] = {
                ...updatedQuestions[session.currentQuestionIndex],
                answered: true,
                evaluation
            };

            setSession(prev => prev ? { ...prev, questions: updatedQuestions } : null);
            setShowEvaluation(true);
        }

        setIsEvaluating(false);
    };

    const handleGenerateModelAnswer = async () => {
        if (!session || isGenerating || isEvaluating || isSolving) return;

        const currentQuestion = session.questions[session.currentQuestionIndex];
        const startIndex = session.currentQuestionIndex;

        setIsSolving(true);
        setModelAnswerText('');

        let fullAnswer = '';

        await generateModelAnswer(
            currentQuestion,
            noteContent,
            (chunk) => {
                if (currentQuestionIndexRef.current === startIndex) {
                    fullAnswer += chunk;
                    setModelAnswerText(fullAnswer);
                }
            },
            pdfData || undefined
        );

        if (currentQuestionIndexRef.current !== startIndex) {
            setIsSolving(false);
            return;
        }

        // Add model answer as a special message
        const modelAnswerMsg: InterviewMessage = {
            id: `model-${Date.now()}`,
            role: 'interviewer',
            text: `## 📚 Resposta Modelo\n\n${fullAnswer}`,
            timestamp: new Date(),
            questionId: currentQuestion.id
        };

        // Mark question as answered with a "model" evaluation
        const updatedQuestions = [...session.questions];
        updatedQuestions[session.currentQuestionIndex] = {
            ...updatedQuestions[session.currentQuestionIndex],
            answered: true,
            candidateResponse: '[Resposta modelo gerada automaticamente]',
            evaluation: {
                score: 'hire',
                dimensions: { depth: 4, tradeoffs: 4, communication: 4 },
                feedback: 'Resposta modelo gerada automaticamente.',
                strengths: ['Resposta completa seguindo framework CCMT'],
                improvements: []
            }
        };

        setSession(prev => prev ? {
            ...prev,
            questions: updatedQuestions,
            messages: [...prev.messages, modelAnswerMsg]
        } : null);

        setModelAnswerText(null);
        setIsSolving(false);
    };

    const handleSolveAll = async () => {
        if (!session || isGenerating || isEvaluating || isSolving || isSolvingAll) return;

        if (!confirm('Isso irá gerar respostas modelo para todas as questões restantes e finalizar a entrevista. Continuar?')) {
            return;
        }

        setIsSolvingAll(true);

        let currentSession = { ...session };
        const totalQuestions = currentSession.questions.length;

        for (let i = 0; i < totalQuestions; i++) {
            const question = currentSession.questions[i];

            // Skip already answered questions
            if (question.answered) continue;

            // Present question if not yet presented
            const existingMessages = currentSession.messages.filter(m => m.questionId === question.id);
            if (existingMessages.length === 0) {
                setSession(prev => prev ? { ...prev, currentQuestionIndex: i } : null);
                currentQuestionIndexRef.current = i;

                // Present the question first
                setIsGenerating(true);
                setCurrentStreamingText('');

                let questionText = '';
                await getInterviewerResponse(
                    { ...currentSession, currentQuestionIndex: i },
                    noteContent,
                    (chunk) => {
                        questionText += chunk;
                        setCurrentStreamingText(questionText);
                    },
                    undefined,
                    pdfData || undefined
                );

                const questionMsg: InterviewMessage = {
                    id: `q-${Date.now()}-${i}`,
                    role: 'interviewer',
                    text: questionText,
                    timestamp: new Date(),
                    questionId: question.id
                };

                currentSession = {
                    ...currentSession,
                    messages: [...currentSession.messages, questionMsg]
                };

                setCurrentStreamingText('');
                setIsGenerating(false);
            }

            // Generate model answer
            setIsSolving(true);
            setModelAnswerText('');

            let modelAnswer = '';
            await generateModelAnswer(
                question,
                noteContent,
                (chunk) => {
                    modelAnswer += chunk;
                    setModelAnswerText(modelAnswer);
                },
                pdfData || undefined
            );

            const modelAnswerMsg: InterviewMessage = {
                id: `model-${Date.now()}-${i}`,
                role: 'interviewer',
                text: `## 📚 Resposta Modelo\n\n${modelAnswer}`,
                timestamp: new Date(),
                questionId: question.id
            };

            // Update question as answered
            const updatedQuestions = [...currentSession.questions];
            updatedQuestions[i] = {
                ...updatedQuestions[i],
                answered: true,
                candidateResponse: '[Resposta modelo gerada automaticamente]',
                evaluation: {
                    score: 'hire',
                    dimensions: { depth: 4, tradeoffs: 4, communication: 4 },
                    feedback: 'Resposta modelo gerada automaticamente.',
                    strengths: ['Resposta completa seguindo framework CCMT'],
                    improvements: []
                }
            };

            currentSession = {
                ...currentSession,
                questions: updatedQuestions,
                messages: [...currentSession.messages, modelAnswerMsg]
            };

            setSession(currentSession);
            setModelAnswerText(null);
            setIsSolving(false);
        }

        // Generate final verdict
        setIsGenerating(true);
        const verdict = await generateFinalVerdict(currentSession);

        if (verdict) {
            const finalSession = {
                ...currentSession,
                isComplete: true,
                finalVerdict: verdict
            };
            setSession(finalSession);

            // Auto-save transcript
            await handleSaveTranscript(finalSession);
        }

        setIsGenerating(true); // wait, should be false? but looking at original...
        setIsGenerating(false);
        setIsSolvingAll(false);
    };

    const handleNextQuestion = async () => {
        if (!session) return;

        setShowEvaluation(false);
        setModelAnswerText(null);
        const nextIndex = session.currentQuestionIndex + 1;

        if (nextIndex >= session.questions.length) {
            // All questions answered, generate final verdict
            await handleFinishInterview();
        } else {
            const updatedSession = {
                ...session,
                currentQuestionIndex: nextIndex
            };
            setSession(updatedSession);
            await presentCurrentQuestion(updatedSession);
        }
    };

    const handleSelectQuestion = async (index: number) => {
        if (!session || index === session.currentQuestionIndex) return;
        if (isGenerating || isEvaluating || isSolving || isSolvingAll) return;

        setShowEvaluation(false);
        setModelAnswerText(null);
        setCurrentStreamingText('');

        const updatedSession = {
            ...session,
            currentQuestionIndex: index
        };

        setSession(updatedSession);

        // Present question if not already presented
        await presentCurrentQuestion(updatedSession);
    };

    const handleFinishInterview = async () => {
        if (!session) return;

        setIsGenerating(true);

        // Mark remaining questions as complete if needed
        const updatedQuestions = session.questions.map(q =>
            q.answered ? q : { ...q, answered: true }
        );

        // Generate final verdict
        const verdict = await generateFinalVerdict({ ...session, questions: updatedQuestions });

        if (verdict) {
            setSession(prev => prev ? {
                ...prev,
                questions: updatedQuestions,
                isComplete: true,
                finalVerdict: verdict
            } : null);

            // Auto-save transcript
            await handleSaveTranscript({ ...session, questions: updatedQuestions, isComplete: true, finalVerdict: verdict });
        }

        setIsGenerating(false);
    };

    const handleSaveTranscript = async (sessionToSave?: InterviewSession) => {
        const targetSession = sessionToSave || session;
        if (!targetSession || !directoryHandle) return;

        try {
            const transcript = await generateInterviewTranscript(targetSession, noteName);

            const parentPath = getParentFolderPath(noteId);
            let currentHandle = directoryHandle;

            for (const folderName of parentPath) {
                if (!folderName) continue;
                currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
            }

            // Create "entrevistas" folder at the same level as the note's parent
            const entrevistasHandle = await currentHandle.getDirectoryHandle('entrevistas', { create: true });

            const safeTitle = sanitizeFileName(noteName);
            const fileName = `entrevista_${safeTitle}_${Date.now()}.md`;

            const fileHandle = await entrevistasHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(transcript);
            await writable.close();

            alert(`Transcrição salva com sucesso em entrevistas/${fileName}!`);
        } catch (error) {
            console.error('Error saving transcript:', error);
            alert('Erro ao salvar a transcrição.');
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];

                recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

                recorder.onstop = async () => {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    setIsTranscribing(true);

                    try {
                        const base64 = await blobToBase64(blob);
                        const transcription = await transcribeAudio(base64, 'audio/webm');
                        if (transcription) {
                            setInputValue(prev => prev + (prev ? " " : "") + transcription);
                        }
                    } catch (err) {
                        console.error("Transcription failed:", err);
                        alert("Falha na transcrição do áudio.");
                    } finally {
                        setIsTranscribing(false);
                        streamRef.current?.getTracks().forEach(track => track.stop());
                    }
                };

                recorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Microphone error:", err);
                alert("Erro ao acessar o microfone. Verifique as permissões do navegador.");
            }
        }
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const item = e.clipboardData.items[0];
        if (item?.type.includes('image')) {
            e.preventDefault();
            const blob = item.getAsFile();
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                const base64 = await blobToBase64(blob);
                setPendingImage({ url: imageUrl, base64, mimeType: blob.type });
            }
        }
    };

    const removePendingImage = () => {
        if (pendingImage?.url) {
            URL.revokeObjectURL(pendingImage.url);
        }
        setPendingImage(null);
    };

    // Loading state
    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="w-16 h-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium animate-pulse">Preparando entrevista técnica...</p>
                <p className="text-sm text-gray-400 mt-2">Gerando questões conceituais baseadas no conteúdo</p>
            </div>
        );
    }

    // Error state
    if (!session) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <i className="fa-solid fa-circle-exclamation text-4xl text-red-400 mb-4"></i>
                <p className="text-gray-600 font-medium">Erro ao iniciar a entrevista</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Voltar
                </button>
            </div>
        );
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const isBusy = isGenerating || isEvaluating || isSolving || isSolvingAll;

    // Complete state - show final verdict
    if (session.isComplete && session.finalVerdict) {
        return (
            <div className="h-full bg-gray-50 rounded-xl overflow-hidden flex flex-col border border-gray-200 shadow-lg">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <i className="fa-solid fa-user-tie text-white"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Entrevista Concluída</h2>
                            <p className="text-xs text-gray-500">{noteName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-xl hover:bg-gray-100">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                {/* Final Verdict */}
                <div className="flex-1 overflow-y-auto p-6">
                    <FinalVerdict session={session} />
                </div>

                {/* Footer */}
                <div className="bg-white p-4 border-t border-gray-200">
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => handleSaveTranscript()}
                            className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors flex items-center gap-2"
                        >
                            <i className="fa-solid fa-download"></i>
                            Baixar Transcrição
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 rounded-xl overflow-hidden flex flex-col border border-gray-200 shadow-lg">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 z-10">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <i className="fa-solid fa-user-tie text-white"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Entrevista Técnica Conceitual</h2>
                            <p className="text-xs text-gray-500">
                                Questão {session.currentQuestionIndex + 1} de {session.questions.length} • {noteName}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGenerateModelAnswer}
                            disabled={isBusy || currentQuestion.answered}
                            className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100 hover:bg-amber-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            title="Gerar resposta modelo para esta questão"
                        >
                            <i className="fa-solid fa-lightbulb"></i>
                            <span>Resolver</span>
                        </button>
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={isBusy || !currentQuestion.candidateResponse}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            title="Submeter resposta e receber avaliação"
                        >
                            <i className="fa-solid fa-check"></i>
                            <span>Avaliar Resposta</span>
                        </button>
                        <button
                            onClick={handleSolveAll}
                            disabled={isBusy}
                            className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                            title="Resolver todas as questões automaticamente"
                        >
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            <span>Resolver Tudo</span>
                        </button>
                        <button
                            onClick={handleFinishInterview}
                            disabled={isBusy}
                            className="px-4 py-2 bg-violet-50 text-violet-700 rounded-xl text-xs font-bold border border-violet-100 hover:bg-violet-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                            title="Finalizar entrevista e ver veredicto"
                        >
                            <i className="fa-solid fa-flag-checkered"></i>
                            <span>Finalizar</span>
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-2"></div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-xl hover:bg-gray-100">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Question Progress */}
                <QuestionProgress
                    questions={session.questions}
                    currentIndex={session.currentQuestionIndex}
                    onSelectQuestion={handleSelectQuestion}
                />
            </div>

            {/* Chat Area or Evaluation */}
            {showEvaluation && currentQuestion.evaluation ? (
                <div className="flex-1 overflow-y-auto p-6">
                    <EvaluationCard
                        evaluation={currentQuestion.evaluation}
                        questionNumber={currentQuestion.number}
                    />
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleNextQuestion}
                            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200 flex items-center gap-2"
                        >
                            {session.currentQuestionIndex + 1 >= session.questions.length ? (
                                <>
                                    <i className="fa-solid fa-flag-checkered"></i>
                                    Ver Resultado Final
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-arrow-right"></i>
                                    Próxima Questão
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                    <MessageList
                        messages={session.messages.filter(m => m.questionId === currentQuestion.id)}
                        isGenerating={isGenerating || isSolving}
                        currentStreamingText={currentStreamingText || modelAnswerText || ''}
                    />
                </div>
            )}

            {/* Input Area */}
            {!showEvaluation && (
                <div className="bg-white p-4 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="max-w-4xl mx-auto flex items-end gap-3">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all flex flex-col gap-2 relative">
                            {pendingImage && (
                                <div className="flex items-start gap-2 p-2 bg-violet-50 rounded-xl border border-violet-100">
                                    <img
                                        src={pendingImage.url}
                                        alt="Anexo"
                                        className="w-20 h-20 object-cover rounded-lg border border-violet-200 shadow-sm"
                                    />
                                    <div className="flex-1 flex flex-col gap-1">
                                        <span className="text-xs font-medium text-violet-700">Imagem anexada</span>
                                        <span className="text-[10px] text-violet-500">Será enviada junto com sua mensagem</span>
                                    </div>
                                    <button
                                        onClick={removePendingImage}
                                        className="w-6 h-6 rounded-full bg-white border border-violet-200 flex items-center justify-center text-violet-400 hover:text-red-500 hover:border-red-200 transition-colors"
                                        title="Remover imagem"
                                    >
                                        <i className="fa-solid fa-xmark text-xs"></i>
                                    </button>
                                </div>
                            )}
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                onPaste={handlePaste}
                                placeholder={isRecording ? "Gravando áudio..." : isTranscribing ? "Transcrevendo áudio..." : isSolvingAll ? "Resolvendo todas as questões..." : "Responda à pergunta do entrevistador..."}
                                className={`w-full bg-transparent border-none focus:ring-0 text-gray-700 resize-none max-h-32 text-sm leading-relaxed ${isTranscribing ? 'opacity-50' : ''}`}
                                rows={2}
                                disabled={isBusy || isRecording || isTranscribing}
                            />
                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                                <span className="flex items-center gap-2">
                                    <i className="fa-solid fa-microphone text-xs opacity-50"></i>
                                    Clique para gravar | Ctrl+V para colar imagem
                                </span>
                                <span>Shift+Enter para nova linha</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={toggleRecording}
                                disabled={isBusy || isTranscribing}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 ${isRecording
                                    ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-200'
                                    : isTranscribing
                                        ? 'bg-violet-100 text-violet-400 cursor-not-allowed'
                                        : 'bg-white text-gray-400 hover:text-violet-600 border border-gray-100'
                                    }`}
                                title={isRecording ? "Parar gravação" : isTranscribing ? "Transcrevendo..." : "Gravar áudio"}
                            >
                                {isTranscribing ? (
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                ) : isRecording ? (
                                    <i className="fa-solid fa-stop"></i>
                                ) : (
                                    <i className="fa-solid fa-microphone"></i>
                                )}
                            </button>

                            <button
                                onClick={handleSendMessage}
                                disabled={(!inputValue.trim() && !pendingImage) || isBusy || isRecording || isTranscribing}
                                className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center transition-all hover:bg-violet-700 disabled:opacity-50 disabled:grayscale shadow-lg shadow-violet-200 active:scale-95"
                            >
                                {isBusy ? (
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                ) : (
                                    <i className="fa-solid fa-paper-plane"></i>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewMode;
