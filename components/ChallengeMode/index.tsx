import React, { useState, useEffect, useRef } from 'react';
import { Challenge, ChallengeSession, ChallengeMessage } from '../../types';
import { startChallengeSession, getInterviewResponse, requestHint, generateSolution, summarizeInterview, generateCustomChallenge } from '../../services/challengeService';
import { RESEARCH_CONTENT } from '../../services/researchService';
import { transcribeAudio } from '../../services/audioService';
import MessageList from './MessageList';
import ChallengeSelection from './ChallengeSelection';
import ChallengeDetail from './ChallengeDetail';
import { useSubjectMode } from '../../hooks/useSubjectMode';

interface ChallengeModeProps {
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

const ChallengeMode: React.FC<ChallengeModeProps> = ({
    noteContent,
    noteName,
    noteId,
    directoryHandle,
    onClose,
    pdfData
}) => {
    const { mode } = useSubjectMode();
    const [session, setSession] = useState<ChallengeSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
    const [selectedForDetail, setSelectedForDetail] = useState<Challenge | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ url: string, base64: string, mimeType: string } | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const lastInitParams = useRef<string>('');

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
        const params = `${noteId}-${mode}`;
        if (lastInitParams.current === params) return;
        lastInitParams.current = params;

        const init = async () => {
            setLoading(true);
            const newSession = await startChallengeSession(
                noteId,
                noteName,
                noteContent,
                pdfData || undefined,
                mode
            );
            setSession(newSession);
            setLoading(false);
        };
        init();
    }, [noteId, noteName, noteContent, pdfData, mode]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session?.messages]);

    const handleSelectChallenge = (challenge: Challenge) => {
        setSelectedForDetail(challenge);
    };

    const handleCustomChallenge = async (suggestion: string) => {
        if (!session) return;

        setIsGeneratingCustom(true);
        try {
            const customChallenge = await generateCustomChallenge(
                suggestion,
                noteContent,
                pdfData || undefined,
                mode
            );

            if (customChallenge) {
                // Mostrar detalhes do desafio gerado antes de iniciar
                setSelectedForDetail(customChallenge);
            }
        } catch (error) {
            console.error("Error generating custom challenge:", error);
        } finally {
            setIsGeneratingCustom(false);
        }
    };

    const handleStartInterview = async (challenge: Challenge) => {
        if (!session) return;

        const updatedSession = { ...session, selectedChallenge: challenge };
        setSession(updatedSession);
        setSelectedForDetail(null);

        setIsGenerating(true);
        let fullResponse = "";
        const introId = Date.now().toString();

        await getInterviewResponse(
            updatedSession,
            RESEARCH_CONTENT,
            noteContent,
            (chunk) => {
                fullResponse += chunk;
                const newMessage: ChallengeMessage = {
                    id: introId,
                    role: 'interviewer',
                    text: fullResponse,
                    timestamp: new Date()
                };
                setSession(prev => {
                    if (!prev) return null;
                    const existingMsg = prev.messages.find(m => m.id === introId);
                    if (existingMsg) {
                        return {
                            ...prev,
                            messages: prev.messages.map(m => m.id === introId ? newMessage : m)
                        };
                    }
                    return { ...prev, messages: [...prev.messages, newMessage] };
                });
            },
            undefined,
            pdfData || undefined
        );
        setIsGenerating(false);
    };

    const handleSendMessage = async () => {
        const text = inputValue;
        if (!text.trim() && !pendingImage) return;
        if (!session || isGenerating) return;

        const userMsg: ChallengeMessage = {
            id: Date.now().toString(),
            role: 'candidate',
            text: text || (pendingImage ? "[Imagem anexada]" : ""),
            timestamp: new Date(),
            imageUrl: pendingImage?.url
        };

        const imagePart = pendingImage ? { mimeType: pendingImage.mimeType, data: pendingImage.base64 } : undefined;

        const updatedSession = {
            ...session,
            messages: [...session.messages, userMsg]
        };

        setSession(updatedSession);
        setInputValue('');
        setPendingImage(null);
        setIsGenerating(true);

        let fullResponse = "";
        const responseId = (Date.now() + 1).toString();

        await getInterviewResponse(
            updatedSession,
            RESEARCH_CONTENT,
            noteContent,
            (chunk) => {
                fullResponse += chunk;
                const aiMsg: ChallengeMessage = {
                    id: responseId,
                    role: 'interviewer',
                    text: fullResponse,
                    timestamp: new Date()
                };
                setSession(prev => {
                    if (!prev) return null;
                    const existingMsg = prev.messages.find(m => m.id === responseId);
                    if (existingMsg) {
                        return {
                            ...prev,
                            messages: prev.messages.map(m => m.id === responseId ? aiMsg : m)
                        };
                    }
                    return { ...prev, messages: [...prev.messages, aiMsg] };
                });
            },
            imagePart,
            pdfData || undefined
        );
        setIsGenerating(false);
    };

    const handleHint = async () => {
        if (!session || isGenerating) return;
        setIsGenerating(true);
        let fullHint = "";
        const hintId = `hint_${Date.now()}`;

        await requestHint(session, (chunk) => {
            fullHint += chunk;
            const hintMsg: ChallengeMessage = {
                id: hintId,
                role: 'interviewer',
                text: fullHint,
                timestamp: new Date()
            };
            setSession(prev => {
                if (!prev) return null;
                const existing = prev.messages.find(m => m.id === hintId);
                if (existing) {
                    return { ...prev, messages: prev.messages.map(m => m.id === hintId ? hintMsg : m) };
                }
                return { ...prev, messages: [...prev.messages, hintMsg] };
            });
        });
        setIsGenerating(false);
    };

    const handleGenerateSolution = async () => {
        if (!session || isGenerating) return;
        setIsGenerating(true);
        let fullSolution = "";
        const solId = `sol_${Date.now()}`;

        const solutionText = await generateSolution(
            session,
            RESEARCH_CONTENT,
            noteContent,
            (chunk) => {
                fullSolution += chunk;
                const solMsg: ChallengeMessage = {
                    id: solId,
                    role: 'interviewer',
                    text: fullSolution,
                    timestamp: new Date()
                };
                setSession(prev => {
                    if (!prev) return null;
                    const existing = prev.messages.find(m => m.id === solId);
                    if (existing) {
                        return { ...prev, messages: prev.messages.map(m => m.id === solId ? solMsg : m) };
                    }
                    return { ...prev, messages: [...prev.messages, solMsg] };
                });
            },
            pdfData || undefined
        );

        if (solutionText) {
            const safeTitle = sanitizeFileName(session.selectedChallenge?.title || 'solucao');
            const solFileName = `solucao_${safeTitle}_${Date.now()}.md`;

            const markdownContent = `# Solução Técnica: ${session.selectedChallenge?.title}\n\n` +
                `**Tipo:** ${session.selectedChallenge?.type}\n` +
                `**Tema da Nota:** ${noteName}\n\n` +
                `---\n\n` +
                `${solutionText}\n\n` +
                `---\n*Gerado automaticamente pelo Smart Handbook em ${new Date().toLocaleString()}*`;

            await handleSaveToFile(solFileName, markdownContent);
            alert(`Solução salva com sucesso como ${solFileName} na pasta 'desafios'!`);
        }
        setIsGenerating(false);
    };

    const handleSaveInterview = async () => {
        if (!session || isGenerating) return;
        setIsGenerating(true);
        const summary = await summarizeInterview(session);
        if (summary) {
            const safeTitle = sanitizeFileName(session.selectedChallenge?.title || 'entrevista');
            const saveFileName = `revisao_${safeTitle}_${Date.now()}.md`;

            const markdownContent = `# Revisão de Entrevista: ${session.selectedChallenge?.title}\n\n` +
                `**Duração:** ${session.messages.length} mensagens trocadas\n` +
                `**Data:** ${new Date().toLocaleString()}\n\n` +
                `---\n\n` +
                `${summary}\n`;

            await handleSaveToFile(saveFileName, markdownContent);
            alert(`Revisão salva com sucesso como ${saveFileName} na pasta 'desafios'!`);
        }
        setIsGenerating(false);
    };

    const handleSaveToFile = async (fileName: string, content: string) => {
        if (!directoryHandle) return;
        try {
            const parentPath = getParentFolderPath(noteId);
            let currentHandle = directoryHandle;
            for (const folderName of parentPath) {
                if (!folderName) continue;
                currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
            }
            const desafiosHandle = await currentHandle.getDirectoryHandle('desafios', { create: true });
            const fileHandle = await desafiosHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            // Stop recording
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            // Start recording
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

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium animate-pulse">Preparando desafios de {mode === 'data-engineering' ? 'Engenharia de Dados' : mode === 'mathematics' ? 'Matemática' : 'Computação'}...</p>
            </div>
        );
    }

    if (!session?.selectedChallenge) {
        if (selectedForDetail) {
            return (
                <div className="h-full bg-gray-50 rounded-xl overflow-hidden flex flex-col border border-gray-200">
                    <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-trophy text-amber-500"></i>
                            <h2 className="text-xl font-bold text-gray-800">Detalhes do Desafio</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-lg">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <ChallengeDetail
                            challenge={selectedForDetail}
                            onStart={() => handleStartInterview(selectedForDetail)}
                            onBack={() => setSelectedForDetail(null)}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full bg-gray-50 rounded-xl overflow-hidden flex flex-col border border-gray-200">
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <i className="fa-solid fa-trophy text-amber-500"></i>
                            Modo Desafio
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mode === 'data-engineering' ? 'bg-emerald-100 text-emerald-700' :
                                mode === 'mathematics' ? 'bg-purple-100 text-purple-700' :
                                    'bg-indigo-100 text-indigo-700'
                                }`}>
                                {mode === 'data-engineering' ? 'Eng. Dados' :
                                    mode === 'mathematics' ? 'Matemática' : 'Computação'}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Selecione um desafio baseado em {noteName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-lg">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <ChallengeSelection
                        alternatives={session?.alternatives || []}
                        onSelect={handleSelectChallenge}
                        onCustomChallenge={handleCustomChallenge}
                        isGeneratingCustom={isGeneratingCustom}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 rounded-xl overflow-hidden flex flex-col border border-gray-200 shadow-lg">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.selectedChallenge.type === 'System Design' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <i className={`fa-solid ${session.selectedChallenge.type === 'System Design' ? 'fa-network-wired' : 'fa-microchip'}`}></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 leading-tight">{session.selectedChallenge.title}</h2>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${session.selectedChallenge.type === 'System Design' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                            {session.selectedChallenge.type}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleHint}
                        disabled={isGenerating}
                        className="group relative px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2"
                        title="Obter uma dica do entrevistador"
                    >
                        <i className="fa-solid fa-lightbulb group-hover:animate-pulse"></i>
                        <span>Hint</span>
                    </button>
                    <button
                        onClick={handleGenerateSolution}
                        disabled={isGenerating}
                        className="group relative px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2"
                        title="Gerar solução exemplar e salvar"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        <span>Solução</span>
                    </button>
                    <button
                        onClick={handleSaveInterview}
                        disabled={isGenerating}
                        className="group relative px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2"
                        title="Salvar resumo da entrevista"
                    >
                        <i className="fa-solid fa-floppy-disk"></i>
                        <span>Salvar</span>
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-2"></div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-xl hover:bg-gray-100 active:scale-90">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                <MessageList messages={session.messages} isGenerating={isGenerating} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex items-end gap-3">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all flex flex-col gap-2 relative">
                        {pendingImage && (
                            <div className="flex items-start gap-2 p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                                <img
                                    src={pendingImage.url}
                                    alt="Anexo"
                                    className="w-20 h-20 object-cover rounded-lg border border-indigo-200 shadow-sm"
                                />
                                <div className="flex-1 flex flex-col gap-1">
                                    <span className="text-xs font-medium text-indigo-700">Imagem anexada</span>
                                    <span className="text-[10px] text-indigo-500">Será enviada junto com sua mensagem</span>
                                </div>
                                <button
                                    onClick={removePendingImage}
                                    className="w-6 h-6 rounded-full bg-white border border-indigo-200 flex items-center justify-center text-indigo-400 hover:text-red-500 hover:border-red-200 transition-colors"
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
                            placeholder={isRecording ? "Gravando áudio..." : isTranscribing ? "Transcrevendo áudio..." : pendingImage ? "Adicione uma descrição à imagem..." : "Escreva sua solução ou COLE uma screenshot (Ctrl+V)..."}
                            className={`w-full bg-transparent border-none focus:ring-0 text-gray-700 resize-none max-h-32 text-sm leading-relaxed ${isTranscribing ? 'opacity-50' : ''}`}
                            rows={2}
                            disabled={isGenerating || isRecording || isTranscribing}
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
                            disabled={isGenerating || isTranscribing}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 ${isRecording
                                ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-200'
                                : isTranscribing
                                    ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed'
                                    : 'bg-white text-gray-400 hover:text-indigo-600 border border-gray-100'
                                }`}
                            title={isRecording ? "Clique para parar e transcrever" : isTranscribing ? "Transcrevendo..." : "Clique para gravar áudio"}
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
                            onClick={() => handleSendMessage()}
                            disabled={(!inputValue.trim() && !pendingImage) || isGenerating || isRecording || isTranscribing}
                            className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            {isGenerating ? (
                                <i className="fa-solid fa-circle-notch fa-spin"></i>
                            ) : (
                                <i className="fa-solid fa-paper-plane"></i>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChallengeMode;
