import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { SolutionViewProps } from './types';

const SolutionView: React.FC<SolutionViewProps> = ({ solution, isStreaming, streamingContent }) => {
    const content = isStreaming ? streamingContent : solution;

    return (
        <div className="mt-4 pt-4 border-t border-teal-100 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                    <i className="fa-solid fa-lightbulb text-teal-600 text-xs"></i>
                </div>
                <span className="text-sm font-semibold text-teal-700">Solução</span>
                {isStreaming && (
                    <span className="text-xs text-teal-500 flex items-center gap-1">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Gerando...
                    </span>
                )}
            </div>
            <div className="bg-gradient-to-br from-white to-teal-50/50 rounded-lg p-4 border border-teal-100">
                <div className="prose prose-sm max-w-none text-gray-700">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                            strong: ({ node, ...props }) => <strong className="text-teal-800 font-semibold" {...props} />,
                            code: ({ node, ...props }) => (
                                <code className="bg-teal-50 text-teal-700 px-1 py-0.5 rounded text-sm" {...props} />
                            )
                        }}
                    >
                        {content || ''}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
};

export default SolutionView;
