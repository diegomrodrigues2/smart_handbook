import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Mermaid from './Mermaid';
import AudioPlayer from './AudioPlayer';
import StudyModesMenu from './StudyModesMenu';
import { generateAudioExplanation, createAudioBlobUrl } from '../services/audioService';
import { useSubjectMode } from '../hooks/useSubjectMode';


interface MarkdownViewerProps {
    content: string;
    fileName: string;
    onUpdateContent: (newContent: string) => void;
    onClose: () => void;
    resolveImage?: (src: string) => Promise<string | null>;
    onSelectFile?: (href: string) => void;
    onStartLearning?: () => void;
    onStartLesson?: () => void;
    onStartWorkbook?: () => void;
    onStartChallenge?: () => void;
    onStartInterview?: () => void;
    onStartInterview?: () => void;
    onStartPairProgramming?: () => void;
    onStartConceptExtraction?: () => void;
}

const MarkdownImage: React.FC<{ src: string; alt?: string; resolveImage?: (src: string) => Promise<string | null> }> = ({ src, alt, resolveImage }) => {
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (resolveImage) {
            resolveImage(src).then(res => {
                if (isMounted) setResolvedSrc(res);
            });
        } else {
            setResolvedSrc(src);
        }
        return () => { isMounted = false; };
    }, [src, resolveImage]);

    if (!resolvedSrc) return <span className="inline-block w-full h-48 bg-gray-100 animate-pulse rounded-lg text-center leading-[192px] text-gray-400">Loading image...</span>;

    return <img src={resolvedSrc} alt={alt} className="max-w-full h-auto rounded-lg shadow-md my-6 border border-gray-100" />;
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, fileName, onUpdateContent, onClose, resolveImage, onSelectFile, onStartLearning, onStartLesson, onStartWorkbook, onStartChallenge, onStartInterview, onStartPairProgramming, onStartConceptExtraction }) => {
    const { mode } = useSubjectMode();
    const [isSourceMode, setIsSourceMode] = useState(false);
    const [localContent, setLocalContent] = useState(content);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioStatus, setAudioStatus] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);

    useEffect(() => {
        setLocalContent(content);
    }, [content]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setLocalContent(newVal);
        onUpdateContent(newVal);
    };

    const handleGenerateAudio = async () => {
        setIsGeneratingAudio(true);
        setAudioStatus('Preparando...');

        const result = await generateAudioExplanation(content, setAudioStatus);

        if (result) {
            const url = createAudioBlobUrl(result.audioBase64, result.mimeType);
            setAudioUrl(url);
            setShowPlayer(true);
        }

        setIsGeneratingAudio(false);
        setAudioStatus('');
    };

    const handleClosePlayer = () => {
        setShowPlayer(false);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center bg-gray-50 border-b border-gray-200 px-4 h-10 select-none">
                <div className="flex items-center px-3 py-1 bg-white border border-gray-200 border-b-white rounded-t-md text-sm text-gray-700 font-medium translate-y-[1px] shadow-sm max-w-[300px] md:max-w-[500px]">
                    <span className="mr-2 flex-shrink-0"><i className="fa-regular fa-file-lines text-blue-500"></i></span>
                    <span className="truncate" title={fileName}>{fileName}</span>
                    <button onClick={onClose} className="ml-3 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"><i className="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div className="flex-1"></div>

                {/* Audio Explanation Button */}
                <button
                    onClick={handleGenerateAudio}
                    disabled={isGeneratingAudio}
                    className="text-xs border border-amber-200 rounded-lg px-3 py-1.5 mr-2 transition-all bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 hover:to-orange-100 font-medium flex items-center gap-1.5 disabled:opacity-50"
                    title="Gerar Explicação em Áudio"
                >
                    {isGeneratingAudio ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>{audioStatus || 'Gerando...'}</span>
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-headphones"></i>
                            <span>Ouvir</span>
                        </>
                    )}
                </button>

                {/* Study Modes Dropdown */}
                <StudyModesMenu
                    onStartLearning={onStartLearning}
                    onStartLesson={onStartLesson}
                    onStartWorkbook={onStartWorkbook}
                    onStartChallenge={onStartChallenge}
                    onStartInterview={onStartInterview}
                    onStartPairProgramming={onStartPairProgramming}
                    onStartConceptExtraction={onStartConceptExtraction}
                    mode={mode}
                />

                {/* Source/Preview Toggle */}
                <button
                    onClick={() => setIsSourceMode(!isSourceMode)}
                    className={`text-xs font-mono border border-gray-200 rounded-lg px-3 py-1.5 transition-all ${isSourceMode
                        ? 'bg-blue-100 text-blue-700 border-blue-200 font-semibold'
                        : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    {isSourceMode ? <><i className="fa-solid fa-eye mr-1"></i> Preview</> : <><i className="fa-solid fa-code mr-1"></i> Source</>}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-white relative">
                {isSourceMode ? (
                    <textarea
                        className="w-full h-full p-8 font-mono text-sm resize-none outline-none text-gray-800 leading-relaxed"
                        value={localContent}
                        onChange={handleContentChange}
                        spellCheck={false}
                    />
                ) : (
                    <div className="h-full overflow-y-auto p-8 md:p-12">
                        <div className="max-w-3xl mx-auto markdown-body">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-4xl font-serif text-gray-900 mb-6 pb-4 border-b-2 border-indigo-200" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-2xl font-serif text-indigo-800 mt-10 mb-4 font-semibold" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-xl font-serif text-gray-800 mt-6 mb-3 font-medium" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-4 text-lg text-gray-700 leading-relaxed font-serif" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 font-serif" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 font-serif" {...props} />,
                                    li: ({ node, ...props }) => <li className="text-lg leading-relaxed" {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-300 bg-indigo-50 pl-4 py-2 my-4 italic text-gray-600 font-serif" {...props} />,
                                    hr: () => <hr className="my-8 border-t-2 border-gray-200" />,
                                    strong: ({ node, ...props }) => <strong className="font-bold text-indigo-900" {...props} />,
                                    em: ({ node, ...props }) => <em className="italic text-gray-600" {...props} />,
                                    img: ({ node, src, alt, ...props }) => <MarkdownImage src={src || ''} alt={alt} resolveImage={resolveImage} />,
                                    table: ({ node, ...props }) => (
                                        <div className="my-8 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                                            <table className="w-full text-left border-collapse bg-white font-serif" {...props} />
                                        </div>
                                    ),
                                    thead: ({ node, ...props }) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                                    th: ({ node, ...props }) => <th className="px-6 py-4 text-sm font-bold text-gray-700 uppercase tracking-wider" {...props} />,
                                    td: ({ node, ...props }) => <td className="px-6 py-4 text-base text-gray-600 border-b border-gray-100 font-serif" {...props} />,
                                    tr: ({ node, ...props }) => <tr className="hover:bg-blue-50/30 transition-colors" {...props} />,
                                    a: ({ node, href, children, ...props }) => {
                                        const handleClick = (e: React.MouseEvent) => {
                                            if (href && !href.startsWith('http') && !href.startsWith('#') && onSelectFile) {
                                                e.preventDefault();
                                                onSelectFile(href);
                                            }
                                        };
                                        return (
                                            <a
                                                href={href}
                                                onClick={handleClick}
                                                className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4 transition-colors font-medium decoration-2"
                                                {...props}
                                            >
                                                {children}
                                            </a>
                                        );
                                    },
                                    code: ({ node, className, children, ...props }: any) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const language = match ? match[1] : '';
                                        const codeString = String(children).replace(/\n$/, '');
                                        const isBlock = className || codeString.includes('\n');

                                        if (isBlock && language === 'mermaid') {
                                            return <Mermaid chart={codeString} />;
                                        }

                                        return !isBlock ? (
                                            <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-sm border border-gray-200" {...props}>
                                                {children}
                                            </code>
                                        ) : (
                                            <div className="my-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                                {language && (
                                                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-mono text-gray-500 flex items-center gap-2">
                                                        <i className="fa-solid fa-code text-gray-400"></i>
                                                        {language}
                                                    </div>
                                                )}
                                                <SyntaxHighlighter
                                                    style={github}
                                                    language={language || 'text'}
                                                    PreTag="div"
                                                    customStyle={{
                                                        margin: 0,
                                                        padding: '0.75rem 1rem',
                                                        fontSize: '0.9rem',
                                                        lineHeight: '1.5',
                                                        background: '#f6f8fa',
                                                        borderRadius: 0,
                                                    }}
                                                    codeTagProps={{
                                                        style: {
                                                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                                        }
                                                    }}
                                                    {...props}
                                                >
                                                    {codeString}
                                                </SyntaxHighlighter>
                                            </div>
                                        );
                                    }
                                }}
                            >
                                {localContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {/* Audio Player */}
            {showPlayer && audioUrl && (
                <AudioPlayer
                    audioUrl={audioUrl}
                    title={fileName}
                    onClose={handleClosePlayer}
                />
            )}
        </div>
    );
};

export default MarkdownViewer;