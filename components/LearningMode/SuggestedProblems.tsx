import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { SuggestedProblem } from '../../types';

interface SuggestedProblemsProps {
    problems: SuggestedProblem[];
    activeProblemId?: string;
    problemSessions?: Record<string, any>;
    isThinking: boolean;
    onSelectProblem: (problem: SuggestedProblem) => void;
}

const FOCUS_LABELS = {
    algebraic: { label: 'Algébrico', color: 'bg-blue-100 text-blue-700' },
    geometric: { label: 'Geométrico', color: 'bg-green-100 text-green-700' },
    computational: { label: 'Computacional', color: 'bg-orange-100 text-orange-700' },
    theoretical: { label: 'Teórico', color: 'bg-purple-100 text-purple-700' }
};

const DIFFICULTY_LABELS = {
    basic: { label: 'Básico', color: 'text-green-600' },
    intermediate: { label: 'Intermediário', color: 'text-yellow-600' },
    advanced: { label: 'Avançado', color: 'text-red-600' }
};

const SuggestedProblems: React.FC<SuggestedProblemsProps> = ({
    problems,
    activeProblemId,
    problemSessions,
    isThinking,
    onSelectProblem
}) => {
    if (problems.length === 0) return null;

    return (
        <div className="mt-4 space-y-3">
            <div className="text-xs font-semibold text-indigo-600 mb-3 flex items-center gap-1">
                <i className="fa-solid fa-layer-group"></i>
                Explorar Problemas:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {problems.map((problem, idx) => {
                    const isActive = activeProblemId === problem.id;
                    const hasHistory = problemSessions?.[problem.id];

                    return (
                        <button
                            key={problem.id || idx}
                            onClick={() => onSelectProblem(problem)}
                            disabled={isThinking && !isActive}
                            className={`text-left p-3 rounded-xl border transition-all group relative overflow-hidden ${isActive
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500 text-white shadow-lg scale-[1.02]'
                                : 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start gap-2 relative z-10">
                                <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${isActive ? 'bg-white/20' : 'bg-indigo-100 text-indigo-600'
                                    }`}>
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2 mb-1">
                                        <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-indigo-800'}`}>
                                            {problem.title}
                                        </span>
                                        {hasHistory && !isActive && (
                                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Retomar</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : FOCUS_LABELS[problem.focus].color}`}>
                                            {FOCUS_LABELS[problem.focus].label}
                                        </span>
                                        <span className={`text-[10px] font-medium ${isActive ? 'text-white/80' : DIFFICULTY_LABELS[problem.difficulty].color}`}>
                                            {DIFFICULTY_LABELS[problem.difficulty].label}
                                        </span>
                                    </div>
                                    <div className={`text-xs leading-relaxed ${isActive ? 'text-indigo-50' : 'text-gray-500 line-clamp-2'}`}>
                                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {problem.description}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                                <i className={`fa-solid ${isActive ? 'fa-circle-check text-white' : 'fa-chevron-right text-indigo-300 group-hover:text-indigo-500'} mt-1 transition-colors`}></i>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SuggestedProblems;
