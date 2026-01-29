import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { IntroductionContent, SuggestedProblem } from '../../types';

interface ConceptIntroductionProps {
    introContent: IntroductionContent;
}

export const ConceptIntroduction: React.FC<ConceptIntroductionProps> = ({ introContent }) => {
    return (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <i className="fa-solid fa-microchip text-4xl text-indigo-600"></i>
            </div>
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <i className="fa-solid fa-book-open text-sm"></i>
                </div>
                <h4 className="font-bold text-indigo-900">Fundamentos do Conceito</h4>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                        <span className="w-4 h-px bg-indigo-100"></span>
                        Definição Formal
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-800 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                            {introContent.formalDefinition}
                        </ReactMarkdown>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                        <span className="w-4 h-px bg-purple-100"></span>
                        Intuição Matemática
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-800 bg-purple-50/30 p-3 rounded-xl border border-purple-100/50">
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                            {introContent.intuition}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ActiveProblemStatementProps {
    problem: SuggestedProblem;
}

export const ActiveProblemStatement: React.FC<ActiveProblemStatementProps> = ({ problem }) => {
    return (
        <div className="mb-6 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <i className="fa-solid fa-pen-to-square text-xs"></i>
                </div>
                <div className="flex flex-col">
                    <h5 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Desafio Atual</h5>
                    <h4 className="font-bold text-emerald-900">{problem.title}</h4>
                </div>
            </div>
            <div className="prose prose-sm max-w-none text-emerald-900/80 italic bg-white/40 p-4 rounded-xl border border-emerald-100/50 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} rehypePlugins={[rehypeKatex]}>
                    {problem.description}
                </ReactMarkdown>
            </div>
        </div>
    );
};
