import React from 'react';
import { InterviewMessage } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MessageListProps {
    messages: InterviewMessage[];
    isGenerating: boolean;
    currentStreamingText?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isGenerating, currentStreamingText }) => {
    if (messages.length === 0 && !isGenerating) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center space-y-2">
                    <i className="fa-solid fa-comments text-4xl opacity-30"></i>
                    <p className="text-sm">A entrevista começará em breve...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                        className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${msg.role === 'candidate'
                                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-md'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
                            }`}
                    >
                        {msg.role === 'interviewer' && (
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                    <i className="fa-solid fa-user-tie text-white text-[10px]"></i>
                                </div>
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrevistador</span>
                            </div>
                        )}

                        {msg.imageUrl && (
                            <img
                                src={msg.imageUrl}
                                alt="Anexo"
                                className="max-w-full max-h-64 rounded-lg mb-3 border border-white/20"
                            />
                        )}

                        <div className={`prose prose-sm max-w-none ${msg.role === 'candidate' ? 'prose-invert' : ''}`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            ))}

            {isGenerating && currentStreamingText && (
                <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-5 py-4 shadow-sm bg-white border border-gray-100 text-gray-800">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <i className="fa-solid fa-user-tie text-white text-[10px]"></i>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entrevistador</span>
                            <div className="ml-2 flex gap-1">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {currentStreamingText}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {isGenerating && !currentStreamingText && (
                <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <i className="fa-solid fa-user-tie text-white text-[10px]"></i>
                            </div>
                            <div className="flex gap-1.5">
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageList;
