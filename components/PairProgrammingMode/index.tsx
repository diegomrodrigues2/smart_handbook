import React, { useState, useEffect, useRef } from 'react';
import { PairSession, PairMessage, PairChallenge, ProgrammingLanguage, SubjectMode } from '../../types';
import {
    startPairSession,
    getNavigatorResponse,
    generateFullSolution,
    generatePairSolutionFile,
    getLanguageTemplate,
    getLanguageName
} from '../../services/pairProgrammingService';
import { transcribeAudio } from '../../services/audioService';
import ChallengeSelector from './ChallengeSelector';
import CodeEditor from './CodeEditor';
import ChatPanel from './ChatPanel';

interface PairProgrammingModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    tabId?: string;
    directoryHandle?: FileSystemDirectoryHandle | null;
    onClose: () => void;
    pdfData?: ArrayBuffer | null;
    subjectMode?: SubjectMode;
}

// Linguagens padrão para programação geral
const DEFAULT_LANGUAGES: { id: ProgrammingLanguage; name: string; icon: string }[] = [
    { id: 'python', name: 'Python', icon: 'fa-python' },
    { id: 'java', name: 'Java', icon: 'fa-java' },
    { id: 'cpp', name: 'C++', icon: 'fa-c' },
    { id: 'typescript', name: 'TypeScript', icon: 'fa-js' },
    { id: 'go', name: 'Go', icon: 'fa-golang' },
    { id: 'rust', name: 'Rust', icon: 'fa-rust' }
];

// Linguagens específicas para Data Engineering
const DATA_ENGINEERING_LANGUAGES: { id: ProgrammingLanguage; name: string; icon: string }[] = [
    { id: 'sql', name: 'SQL', icon: 'fa-database' },
    { id: 'pyspark', name: 'PySpark', icon: 'fa-python' },
    { id: 'scala', name: 'Scala (Spark)', icon: 'fa-code' },
    { id: 'python', name: 'Python', icon: 'fa-python' }
];

const sanitizeFileName = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 40);
};

const getParentFolderPath = (noteId: string): string[] => {
    const parts = noteId.split(/[\\/]/);
    if (parts.length >= 3) {
        return parts.slice(1, -2);
    }
    return parts.slice(1, -1);
};

const PairProgrammingMode: React.FC<PairProgrammingModeProps> = ({
    noteContent,
    noteName,
    noteId,
    directoryHandle,
    onClose,
    pdfData,
    subjectMode = 'computing'
}) => {
    // Selecionar linguagens baseado no modo
    const LANGUAGES = subjectMode === 'data-engineering' ? DATA_ENGINEERING_LANGUAGES : DEFAULT_LANGUAGES;
    const defaultLang = subjectMode === 'data-engineering' ? 'sql' : 'python';

    const [session, setSession] = useState<PairSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>(defaultLang);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSolving, setIsSolving] = useState(false);
    const [currentStreamingText, setCurrentStreamingText] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    // Resizable chat panel state
    const [chatPanelWidth, setChatPanelWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const hasInitialized = useRef(false);

    // Handle resize drag
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = containerRect.right - e.clientX;

            // Clamp between min and max width
            const clampedWidth = Math.max(300, Math.min(600, newWidth));
            setChatPanelWidth(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Add cursor style to body
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

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
            const newSession = await startPairSession(
                noteId,
                noteName,
                noteContent,
                selectedLanguage,
                subjectMode,
                pdfData || undefined
            );
            if (newSession) {
                setSession(newSession);
            }
            setLoading(false);
        };
        init();
    }, [noteId, noteName, noteContent, selectedLanguage, subjectMode, pdfData]);

    const handleLanguageChange = (lang: ProgrammingLanguage) => {
        setSelectedLanguage(lang);
        if (session) {
            setSession({
                ...session,
                language: lang,
                currentCode: getLanguageTemplate(lang)
            });
        }
    };

    const handleSelectChallenge = (challenge: PairChallenge) => {
        if (!session) return;

        const starterCode = challenge.initialDraft || getLanguageTemplate(session.language);

        // Contexto de negócio para a mensagem de boas-vindas
        const businessContextSection = challenge.businessContext
            ? `### 🏢 Contexto

${challenge.businessContext}

` : '';

        const welcomeMsg: PairMessage = {
            id: Date.now().toString(),
            role: 'navigator',
            text: `## 🎯 ${challenge.title}

${businessContextSection}Este é **código de produção** extraído de um sistema real. Você está em uma sessão de **code review colaborativo** no estilo Driver-Navigator.

### Seu papel como Driver:

1. **🔍 Analise o código** - Explique em voz alta o que cada parte faz
2. **⚠️ Identifique problemas** - Há bugs, race conditions, memory leaks ou ineficiências?
3. **📊 Avalie complexidade** - Qual o Big-O? O código escala bem?
4. **🏗️ Proponha melhorias** - Como você refatoraria este código?

### Perguntas que vou fazer durante a sessão:
- *"O que acontece se esse código receber 10x mais carga?"*
- *"Você vê alguma condição de corrida aqui?"*
- *"Como você testaria esta função?"*
- *"Qual o impacto na latência P99?"*

### 💡 Dica
Use o **microfone** 🎙️ para explicar seu raciocínio como faria em uma discussão técnica real. Verbalize suas hipóteses antes de modificar o código.

**Comece explicando o que o código faz e qual problema de negócio ele resolve.**`,
            timestamp: new Date()
        };

        setSession({
            ...session,
            selectedChallenge: challenge,
            currentCode: starterCode,
            messages: [welcomeMsg]
        });
    };

    const handleCodeChange = (newCode: string) => {
        if (!session) return;
        setSession({ ...session, currentCode: newCode });
    };

    const handleSendMessage = async (overrideText?: string) => {
        const text = overrideText || inputValue.trim();
        if (!text || !session || isGenerating || isSolving) return;

        const driverMsg: PairMessage = {
            id: Date.now().toString(),
            role: 'driver',
            text,
            timestamp: new Date(),
            codeSnapshot: session.currentCode
        };

        const updatedSession = {
            ...session,
            messages: [...session.messages, driverMsg]
        };

        setSession(updatedSession);
        setInputValue('');
        setIsGenerating(true);
        setCurrentStreamingText('');

        const result = await getNavigatorResponse(
            updatedSession,
            noteContent,
            text,
            session.currentCode,
            (chunk) => {
                setCurrentStreamingText(prev => prev + chunk);
            },
            pdfData || undefined
        );

        const navigatorMsg: PairMessage = {
            id: (Date.now() + 1).toString(),
            role: 'navigator',
            text: result.text,
            timestamp: new Date(),
            suggestedCode: result.suggestedCode
        };

        setSession(prev => prev ? {
            ...prev,
            messages: [...prev.messages, navigatorMsg]
        } : null);

        setCurrentStreamingText('');
        setIsGenerating(false);
    };

    const handleApplySuggestedCode = (code: string) => {
        if (!session) return;
        setSession({ ...session, currentCode: code });
    };

    const handleSolve = async () => {
        if (!session || isSolving || isGenerating) return;

        if (!confirm('Isso irá revelar a solução completa. Tem certeza?')) return;

        setIsSolving(true);
        setCurrentStreamingText('');

        const solution = await generateFullSolution(
            session,
            noteContent,
            (chunk) => {
                setCurrentStreamingText(prev => prev + chunk);
            },
            pdfData || undefined
        );

        if (solution) {
            const solutionMsg: PairMessage = {
                id: Date.now().toString(),
                role: 'navigator',
                text: `## ✅ Solução Completa\n\n${solution.explanation}`,
                timestamp: new Date(),
                suggestedCode: solution.code
            };

            const finalSession = {
                ...session,
                currentCode: solution.code,
                messages: [...session.messages, solutionMsg],
                isComplete: true,
                solution
            };

            setSession(finalSession);

            // Auto-save
            await handleSaveSolution(finalSession);
        }

        setCurrentStreamingText('');
        setIsSolving(false);
    };

    const handleSaveSolution = async (sessionToSave?: PairSession) => {
        const targetSession = sessionToSave || session;
        if (!targetSession || !directoryHandle || !targetSession.selectedChallenge) return;

        try {
            const content = generatePairSolutionFile(targetSession, noteName);

            const parentPath = getParentFolderPath(noteId);
            let currentHandle = directoryHandle;

            for (const folderName of parentPath) {
                if (!folderName) continue;
                currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
            }

            const desafiosHandle = await currentHandle.getDirectoryHandle('desafios', { create: true });

            const safeTitle = sanitizeFileName(targetSession.selectedChallenge.title);
            const fileName = `pair_${safeTitle}_${Date.now()}.md`;

            const fileHandle = await desafiosHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            alert(`Solução salva em desafios/${fileName}!`);
        } catch (error) {
            console.error('Error saving solution:', error);
            alert('Erro ao salvar a solução.');
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
                    } finally {
                        setIsTranscribing(false);
                        streamRef.current?.getTracks().forEach(track => track.stop());
                    }
                };

                recorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Microphone error:", err);
            }
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="w-16 h-16 border-4 border-cyan-100 border-t-cyan-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium animate-pulse">Preparando sessão de Pair Programming...</p>
                <p className="text-sm text-gray-400 mt-2">Gerando desafios baseados no conteúdo</p>
            </div>
        );
    }

    // Error state
    if (!session) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <i className="fa-solid fa-circle-exclamation text-4xl text-red-400 mb-4"></i>
                <p className="text-gray-600 font-medium">Erro ao iniciar a sessão</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    Voltar
                </button>
            </div>
        );
    }

    // Challenge selection state
    if (!session.selectedChallenge) {
        return (
            <ChallengeSelector
                challenges={session.challenges}
                languages={LANGUAGES}
                selectedLanguage={selectedLanguage}
                onSelectLanguage={handleLanguageChange}
                onSelectChallenge={handleSelectChallenge}
                onClose={onClose}
                noteName={noteName}
            />
        );
    }

    const isBusy = isGenerating || isSolving;

    return (
        <div className="h-full bg-gray-50 rounded-xl overflow-hidden flex flex-col border border-gray-200 shadow-lg">
            {/* Header */}
            <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <i className="fa-solid fa-code text-white"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Pair Programming</h2>
                        <p className="text-xs text-gray-500">
                            {session.selectedChallenge.title} • {getLanguageName(session.language)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Language Selector */}
                    <select
                        value={session.language}
                        onChange={(e) => handleLanguageChange(e.target.value as ProgrammingLanguage)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isBusy}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.id} value={lang.id}>{lang.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => handleSendMessage('Por favor, avalie meu código atual e as melhorias que eu fiz.')}
                        disabled={isBusy}
                        className="px-4 py-2 bg-cyan-50 text-cyan-700 rounded-xl text-xs font-bold border border-cyan-100 hover:bg-cyan-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                        title="Pedir avaliação do Navigator"
                    >
                        <i className="fa-solid fa-graduation-cap"></i>
                        <span>Avaliar</span>
                    </button>

                    <button
                        onClick={handleSolve}
                        disabled={isBusy}
                        className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100 hover:bg-amber-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                        title="Revelar solução ideal"
                    >
                        <i className="fa-solid fa-lightbulb"></i>
                        <span>Ver Solução</span>
                    </button>

                    <button
                        onClick={() => handleSaveSolution()}
                        disabled={isBusy}
                        className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                        title="Salvar e concluir"
                    >
                        <i className="fa-solid fa-check"></i>
                        <span>Concluir</span>
                    </button>

                    <div className="w-px h-6 bg-gray-200 mx-1"></div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-xl hover:bg-gray-100"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            {/* Main Content - Split View */}
            <div ref={containerRef} className="flex-1 flex overflow-hidden">
                {/* Code Editor Panel */}
                <div className="flex-1 flex flex-col border-r border-gray-200">
                    <CodeEditor
                        code={session.currentCode}
                        language={session.language}
                        onChange={handleCodeChange}
                        disabled={isBusy}
                    />
                </div>

                {/* Resize Handle */}
                <div
                    onMouseDown={handleResizeStart}
                    className={`
                        w-1 hover:w-1.5 bg-gray-200 hover:bg-cyan-400 cursor-col-resize
                        transition-all duration-150 flex-shrink-0 relative group
                        ${isResizing ? 'bg-cyan-500 w-1.5' : ''}
                    `}
                    title="Arraste para redimensionar"
                >
                    {/* Visual indicator */}
                    <div className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-4 h-8 flex items-center justify-center
                        opacity-0 group-hover:opacity-100 transition-opacity
                        ${isResizing ? 'opacity-100' : ''}
                    `}>
                        <div className="w-0.5 h-6 bg-cyan-500 rounded-full"></div>
                    </div>
                </div>

                {/* Chat Panel */}
                <div
                    className="flex flex-col bg-white flex-shrink-0"
                    style={{ width: `${chatPanelWidth}px` }}
                >
                    <ChatPanel
                        messages={session.messages}
                        challenge={session.selectedChallenge}
                        isGenerating={isGenerating || isSolving}
                        currentStreamingText={currentStreamingText}
                        inputValue={inputValue}
                        onInputChange={setInputValue}
                        onSend={handleSendMessage}
                        onApplySuggestedCode={handleApplySuggestedCode}
                        isRecording={isRecording}
                        isTranscribing={isTranscribing}
                        onToggleRecording={toggleRecording}
                    />
                </div>
            </div>
        </div>
    );
};

export default PairProgrammingMode;
