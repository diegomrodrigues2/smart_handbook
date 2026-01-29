import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { LearningMessage } from '../../types';

interface MessageListProps {
    messages: LearningMessage[];
    currentTutorMessage: string;
    isThinking: boolean;
    renderSuggestedProblems: () => React.ReactNode;
    hasActiveProblem: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
    messages,
    currentTutorMessage,
    isThinking,
    renderSuggestedProblems,
    hasActiveProblem
}) => {
    const renderMessageContent = (msg: LearningMessage) => {
        return (
            <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                    {msg.text}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <>
            {messages.filter(msg => msg.type !== 'intro').map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}>
                    <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${msg.role === 'student'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md'
                            : 'bg-white text-gray-800 border border-indigo-100 rounded-bl-md'
                            }`}
                    >
                        {msg.role === 'tutor' && (
                            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-indigo-600">
                                <i className="fa-solid fa-chalkboard-user"></i>
                                <span>Tutor</span>
                                {msg.type === 'hint' && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">
                                        <i className="fa-solid fa-lightbulb mr-1"></i>Dica
                                    </span>
                                )}
                            </div>
                        )}
                        {renderMessageContent(msg)}
                    </div>
                </div>
            ))}

            {/* Suggested Problems (only if no active problem chosen yet) */}
            {!hasActiveProblem && renderSuggestedProblems()}

            {/* Streaming message */}
            {currentTutorMessage && (
                <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md p-4 bg-white text-gray-800 border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-indigo-600">
                            <i className="fa-solid fa-chalkboard-user animate-pulse"></i>
                            <span>Tutor</span>
                        </div>
                        <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {currentTutorMessage}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}

            {/* Thinking indicator */}
            {isThinking && !currentTutorMessage && (
                <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-bl-md p-4 border border-indigo-100 shadow-sm">
                        <div className="flex items-center gap-2 text-indigo-500">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-sm">Pensando...</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MessageList;
