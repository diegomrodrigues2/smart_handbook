import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import Mermaid from './Mermaid';


interface MarkdownViewerProps {
    content: string;
    fileName: string;
    onUpdateContent: (newContent: string) => void;
    onClose: () => void;
    resolveImage?: (src: string) => Promise<string | null>;
    onSelectFile?: (href: string) => void;
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

    if (!resolvedSrc) return <div className="w-full h-48 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Loading image...</div>;

    return <img src={resolvedSrc} alt={alt} className="max-w-full h-auto rounded-lg shadow-md my-6 border border-gray-100" />;
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, fileName, onUpdateContent, onClose, resolveImage, onSelectFile }) => {
    const [isSourceMode, setIsSourceMode] = useState(false);
    const [localContent, setLocalContent] = useState(content);

    useEffect(() => {
        setLocalContent(content);
    }, [content]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setLocalContent(newVal);
        onUpdateContent(newVal);
    };

    return (
        <div className="h-full flex flex-col bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center bg-gray-50 border-b border-gray-200 px-4 h-10 select-none">
                <div className="flex items-center px-3 py-1 bg-white border border-gray-200 border-b-white rounded-t-md text-sm text-gray-700 font-medium translate-y-[1px] shadow-sm">
                    <span className="mr-2"><i className="fa-regular fa-file-lines text-blue-500"></i></span>
                    {fileName}
                    <button onClick={onClose} className="ml-3 text-gray-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark text-xs"></i></button>
                </div>
                <div className="flex-1"></div>
                <button
                    onClick={() => setIsSourceMode(!isSourceMode)}
                    className={`text-xs font-mono border border-gray-200 rounded px-3 py-1 transition-all ${isSourceMode
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
                                remarkPlugins={[remarkMath, remarkGfm]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-4xl font-serif text-gray-900 mb-6 pb-4 border-b border-gray-100" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-2xl font-serif text-gray-800 mt-8 mb-4 font-semibold" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-4 text-lg text-gray-700 leading-relaxed font-serif" {...props} />,
                                    img: ({ node, src, alt, ...props }) => <MarkdownImage src={src || ''} alt={alt} resolveImage={resolveImage} />,
                                    table: ({ node, ...props }) => (
                                        <div className="my-8 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                                            <table className="w-full text-left border-collapse bg-white" {...props} />
                                        </div>
                                    ),
                                    thead: ({ node, ...props }) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                                    th: ({ node, ...props }) => <th className="px-6 py-4 text-sm font-bold text-gray-700 uppercase tracking-wider" {...props} />,
                                    td: ({ node, ...props }) => <td className="px-6 py-4 text-base text-gray-600 border-b border-gray-100" {...props} />,
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
                                                className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-4 transition-colors font-medium decoration-2"
                                                {...props}
                                            >
                                                {children}
                                            </a>
                                        );
                                    },
                                    code: ({ node, inline, className, children, ...props }: any) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const language = match ? match[1] : '';

                                        if (!inline && language === 'mermaid') {
                                            return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                                        }

                                        return inline ? (
                                            <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-sm border border-gray-200" {...props}>
                                                {children}
                                            </code>
                                        ) : (
                                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto mb-6 text-sm shadow-inner" {...props}>
                                                <code>{children}</code>
                                            </pre>
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
        </div>
    );
};

export default MarkdownViewer;