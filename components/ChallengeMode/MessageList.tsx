import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { ChallengeMessage } from '../../types';

interface MessageListProps {
    messages: ChallengeMessage[];
    isGenerating: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isGenerating }) => {
    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-10">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex ${message.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`flex gap-4 max-w-[85%] ${message.role === 'candidate' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg ${message.role === 'interviewer'
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                            : 'bg-gradient-to-br from-gray-700 to-gray-900 text-white'
                            }`}>
                            <i className={`fa-solid ${message.role === 'interviewer' ? 'fa-user-tie' : 'fa-code'}`}></i>
                        </div>

                        {/* Message Content */}
                        <div className={`flex flex-col ${message.role === 'candidate' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-5 py-4 rounded-2xl shadow-sm border ${message.role === 'interviewer'
                                ? 'bg-white border-gray-100'
                                : 'bg-indigo-600 border-indigo-500 text-white'
                                }`}>
                                <div className={`prose prose-sm max-w-none ${message.role === 'candidate' ? 'text-white prose-invert' : 'text-gray-800'}`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-3 border-b border-gray-100 pb-2" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                            code: ({ node, inline, className, children, ...props }: any) => {
                                                const match = /language-(\w+)/.exec(className || '');
                                                return !inline && match ? (
                                                    <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto my-3 text-xs font-mono">
                                                        <code {...props}>{children}</code>
                                                    </pre>
                                                ) : (
                                                    <code className={`px-1 py-0.5 rounded font-mono text-xs ${message.role === 'candidate' ? 'bg-indigo-50' : 'bg-gray-100 text-pink-600'}`} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {message.text}
                                    </ReactMarkdown>
                                </div>

                                {message.imageUrl && (
                                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-sm group">
                                        <img
                                            src={message.imageUrl}
                                            alt="Anexo"
                                            className="w-full h-auto cursor-zoom-in hover:scale-[1.02] transition-transform"
                                            onClick={() => window.open(message.imageUrl, '_blank')}
                                        />
                                    </div>
                                )}

                                {message.audioUrl && (
                                    <div className="mt-3 bg-gray-50 rounded-xl p-2 border border-gray-100 flex items-center gap-3 w-64 shadow-inner">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                            <i className="fa-solid fa-play text-xs"></i>
                                        </div>
                                        <audio src={message.audioUrl} controls className="h-8 flex-1 opacity-70" />
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider px-2">
                                {message.role === 'interviewer' ? 'Tech Lead Interno' : 'Candidato (Você)'} • {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            ))}

            {isGenerating && messages[messages.length - 1]?.role !== 'interviewer' && (
                <div className="flex justify-start">
                    <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                            <i className="fa-solid fa-brain"></i>
                        </div>
                        <div className="flex gap-1.5 message-blink">
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageList;
