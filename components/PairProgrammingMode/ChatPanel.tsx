import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { PairMessage, PairChallenge } from '../../types';

interface ChatPanelProps {
    messages: PairMessage[];
    challenge: PairChallenge;
    isGenerating: boolean;
    currentStreamingText: string;
    inputValue: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onApplySuggestedCode: (code: string) => void;
    isRecording: boolean;
    isTranscribing: boolean;
    onToggleRecording: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    challenge,
    isGenerating,
    currentStreamingText,
    inputValue,
    onInputChange,
    onSend,
    onApplySuggestedCode,
    isRecording,
    isTranscribing,
    onToggleRecording
}) => {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [showProblem, setShowProblem] = useState(true);

    useEffect(() => {
        // Scroll to bottom of messages container without affecting parent scroll
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, currentStreamingText]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Challenge Info Header */}
            <div className="border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`
                                px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                ${challenge.type === 'leetcode' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}
                            `}>
                                {challenge.type === 'leetcode' ? 'LeetCode' : 'Pseudocódigo'}
                            </span>
                            <span className={`
                                px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                ${challenge.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                                    challenge.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'}
                            `}>
                                {challenge.difficulty}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowProblem(!showProblem)}
                            className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                        >
                            <i className={`fa-solid fa-chevron-${showProblem ? 'up' : 'down'} text-[10px]`}></i>
                            {showProblem ? 'Ocultar' : 'Ver problema'}
                        </button>
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm mt-1">{challenge.title}</h3>
                </div>

                {/* Expandable Problem Description */}
                {showProblem && (
                    <div className="px-4 pb-3 border-t border-cyan-100 pt-3 max-h-[200px] overflow-y-auto">
                        <p className="text-xs text-gray-600 mb-3 whitespace-pre-wrap">{challenge.description}</p>

                        {challenge.type === 'leetcode' && (
                            <>
                                {challenge.inputFormat && (
                                    <div className="mb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Input:</span>
                                        <p className="text-xs text-gray-600">{challenge.inputFormat}</p>
                                    </div>
                                )}
                                {challenge.outputFormat && (
                                    <div className="mb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Output:</span>
                                        <p className="text-xs text-gray-600">{challenge.outputFormat}</p>
                                    </div>
                                )}
                                {challenge.examples && challenge.examples.length > 0 && (
                                    <div className="mb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Exemplos:</span>
                                        {challenge.examples.map((ex, i) => (
                                            <div key={i} className="bg-white rounded-lg p-2 mt-1 text-xs border border-gray-100">
                                                <div><span className="text-gray-400">Input:</span> <code className="bg-gray-100 px-1 rounded">{ex.input}</code></div>
                                                <div><span className="text-gray-400">Output:</span> <code className="bg-gray-100 px-1 rounded">{ex.output}</code></div>
                                                {ex.explanation && <div className="text-gray-500 mt-1 text-[10px]">{ex.explanation}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {challenge.constraints && challenge.constraints.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Constraints:</span>
                                        <ul className="text-xs text-gray-600 list-disc list-inside">
                                            {challenge.constraints.map((c, i) => <li key={i}>{c}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}

                        {challenge.type === 'pseudocode' && (
                            <>
                                {challenge.conceptFocus && challenge.conceptFocus.length > 0 && (
                                    <div className="mb-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Foco Conceitual:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {challenge.conceptFocus.map((c, i) => (
                                                <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {challenge.expectedSteps && challenge.expectedSteps.length > 0 && (
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Passos Esperados:</span>
                                        <ol className="text-xs text-gray-600 list-decimal list-inside mt-1">
                                            {challenge.expectedSteps.map((s, i) => <li key={i}>{s}</li>)}
                                        </ol>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        onApplySuggestedCode={onApplySuggestedCode}
                    />
                ))}

                {/* Streaming Message */}
                {isGenerating && currentStreamingText && (
                    <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-compass text-white text-sm"></i>
                        </div>
                        <div className="flex-1 bg-cyan-50 rounded-xl rounded-tl-none p-3 border border-cyan-100">
                            <div className="prose prose-sm max-w-none text-gray-700">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath, remarkGfm]}
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {typeof currentStreamingText === 'string' ? currentStreamingText : String(currentStreamingText || '')}
                                </ReactMarkdown>
                            </div>
                            <span className="inline-block w-2 h-4 bg-cyan-500 animate-pulse ml-1"></span>
                        </div>
                    </div>
                )}

                {/* Loading Indicator */}
                {isGenerating && !currentStreamingText && (
                    <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <i className="fa-solid fa-compass text-white text-sm"></i>
                        </div>
                        <div className="bg-cyan-50 rounded-xl rounded-tl-none p-3 border border-cyan-100">
                            <div className="flex items-center gap-2 text-cyan-600">
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                <span className="text-sm">Navigator está pensando...</span>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isGenerating || isTranscribing}
                            placeholder={
                                isRecording ? '🎤 Gravando...' :
                                    isTranscribing ? '⏳ Transcrevendo...' :
                                        'Explique o código ou proponha melhorias...'
                            }
                            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm bg-white disabled:opacity-50"
                            rows={2}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onToggleRecording}
                            disabled={isGenerating || isTranscribing}
                            className={`
                                w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                ${isRecording
                                    ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }
                                disabled:opacity-50
                            `}
                            title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                        >
                            <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                        </button>

                        <button
                            onClick={onSend}
                            disabled={isGenerating || !inputValue.trim()}
                            className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white flex items-center justify-center hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-cyan-200"
                            title="Enviar"
                        >
                            <i className="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>

                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                    <i className="fa-solid fa-keyboard"></i>
                    Pressione Enter para enviar, Shift+Enter para nova linha
                </p>
            </div>
        </div>
    );
};

const MessageBubble: React.FC<{ message: PairMessage; onApplySuggestedCode: (code: string) => void }> = ({
    message,
    onApplySuggestedCode
}) => {
    const isNavigator = message.role === 'navigator';

    return (
        <div className={`flex gap-2 ${isNavigator ? '' : 'flex-row-reverse'}`}>
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${isNavigator
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }
            `}>
                <i className={`fa-solid ${isNavigator ? 'fa-compass' : 'fa-user'} text-white text-sm`}></i>
            </div>

            <div className={`
                flex-1 rounded-xl p-3 max-w-[85%]
                ${isNavigator
                    ? 'bg-cyan-50 rounded-tl-none border border-cyan-100'
                    : 'bg-gray-100 rounded-tr-none border border-gray-200 ml-auto'
                }
            `}>
                <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            code: ({ className, children }) => {
                                const isBlock = className?.includes('language-');
                                if (isBlock) {
                                    return (
                                        <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto text-xs">
                                            <code>{children}</code>
                                        </pre>
                                    );
                                }
                                return (
                                    <code className="bg-gray-200 px-1 py-0.5 rounded text-xs text-gray-800">
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {typeof message.text === 'string' ? message.text : String(message.text || '')}
                    </ReactMarkdown>
                </div>

                {/* Suggested Code Actions */}
                {message.suggestedCode && (
                    <div className="mt-3 space-y-2">
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            Sugestão de código disponível
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(message.suggestedCode!);
                                    alert('Código copiado! Cole manualmente no editor onde desejar.');
                                }}
                                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-copy"></i>
                                Copiar código
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('⚠️ ATENÇÃO: Isso irá SUBSTITUIR TODO o código atual no editor pela sugestão.\n\nSe você quer apenas adicionar partes, use "Copiar código" e cole manualmente.\n\nDeseja substituir mesmo assim?')) {
                                        onApplySuggestedCode(message.suggestedCode!);
                                    }
                                }}
                                className="flex-1 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors flex items-center justify-center gap-2 border border-amber-200"
                            >
                                <i className="fa-solid fa-rotate"></i>
                                Substituir no editor
                            </button>
                        </div>
                    </div>
                )}

                <span className="text-[10px] text-gray-400 mt-2 block">
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    );
};

export default ChatPanel;
