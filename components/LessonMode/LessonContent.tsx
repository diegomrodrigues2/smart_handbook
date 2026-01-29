import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { LessonContentProps } from './types';

const LessonContent: React.FC<LessonContentProps> = ({ content, isGenerating, onSave, isSaving, isSaved }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll when generating
    useEffect(() => {
        if (isGenerating && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [content, isGenerating]);

    return (
        <div
            ref={scrollRef}
            className="h-full overflow-y-auto p-8 md:p-12 bg-white"
        >
            <div className="max-w-4xl mx-auto">
                {/* Generating indicator */}
                {isGenerating && (
                    <div className="sticky top-0 z-10 mb-4 flex items-center justify-center">
                        <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            Gerando aula... Você pode acompanhar em tempo real
                        </div>
                    </div>
                )}

                {/* Markdown Content */}
                <div className="lesson-content prose prose-lg max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            h1: ({ node, ...props }) => (
                                <h1 className="text-4xl font-serif text-gray-900 mb-6 pb-4 border-b-2 border-indigo-200" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                                <h2 className="text-2xl font-serif text-indigo-800 mt-10 mb-4 font-semibold flex items-center gap-2" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                                <h3 className="text-xl font-serif text-gray-800 mt-6 mb-3 font-medium" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                                <p className="mb-4 text-lg text-gray-700 leading-relaxed font-serif" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                                <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                                <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                                <li className="text-lg leading-relaxed" {...props} />
                            ),
                            blockquote: ({ node, ...props }) => (
                                <blockquote className="border-l-4 border-indigo-300 bg-indigo-50 pl-4 py-2 my-4 italic text-gray-600" {...props} />
                            ),
                            hr: () => (
                                <hr className="my-8 border-t-2 border-gray-200" />
                            ),
                            strong: ({ node, ...props }) => (
                                <strong className="font-bold text-indigo-900" {...props} />
                            ),
                            em: ({ node, ...props }) => (
                                <em className="italic text-gray-600" {...props} />
                            ),
                            code: ({ node, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const language = match ? match[1] : '';
                                const codeString = String(children).replace(/\n$/, '');
                                const isBlock = className || codeString.includes('\n');

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
                        {content}
                    </ReactMarkdown>
                </div>

                {/* Completion indicator with save button */}
                {!isGenerating && content && (
                    <div className="mt-8 pt-8 border-t-2 border-gray-200 flex flex-col items-center gap-4">
                        <div className="inline-flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
                            <i className="fa-solid fa-check-circle"></i>
                            Aula gerada com sucesso
                        </div>

                        {onSave && (
                            <button
                                onClick={onSave}
                                disabled={isSaving || isSaved}
                                className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md ${isSaved
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                                    } disabled:opacity-70`}
                            >
                                {isSaving ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                        Salvando...
                                    </>
                                ) : isSaved ? (
                                    <>
                                        <i className="fa-solid fa-check"></i>
                                        Aula Salva
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-floppy-disk"></i>
                                        Salvar Aula
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonContent;
