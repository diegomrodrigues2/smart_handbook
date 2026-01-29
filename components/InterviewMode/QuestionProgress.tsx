import React from 'react';
import { InterviewQuestion } from '../../types';

interface QuestionProgressProps {
    questions: InterviewQuestion[];
    currentIndex: number;
    onSelectQuestion: (index: number) => void;
}

const categoryLabels: Record<string, string> = {
    'database_internals': 'BD',
    'concurrency': 'Conc.',
    'distributed_systems': 'Dist.',
    'networking': 'Rede',
    'languages_runtimes': 'Lang.',
    'os_fundamentals': 'SO'
};

const categoryIcons: Record<string, string> = {
    'database_internals': 'fa-database',
    'concurrency': 'fa-layer-group',
    'distributed_systems': 'fa-network-wired',
    'networking': 'fa-globe',
    'languages_runtimes': 'fa-code',
    'os_fundamentals': 'fa-microchip'
};

const scoreColors: Record<string, string> = {
    'strong_hire': 'bg-emerald-500',
    'hire': 'bg-green-400',
    'mixed': 'bg-amber-400',
    'no_hire': 'bg-red-400'
};

const QuestionProgress: React.FC<QuestionProgressProps> = ({ questions, currentIndex, onSelectQuestion }) => {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
            {questions.map((q, index) => {
                const isCurrent = index === currentIndex;
                const isCompleted = q.answered;
                const score = q.evaluation?.score;

                return (
                    <button
                        key={q.id}
                        onClick={() => onSelectQuestion(index)}
                        className={`
                            relative flex-shrink-0 w-12 h-12 rounded-xl border-2 transition-all duration-200
                            flex flex-col items-center justify-center gap-0.5
                            ${isCurrent
                                ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-200 scale-110'
                                : isCompleted
                                    ? 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                    : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50'
                            }
                        `}
                        title={`Questão ${q.number}: ${q.question.substring(0, 50)}...`}
                    >
                        <i className={`fa-solid ${categoryIcons[q.category] || 'fa-question'} text-xs ${isCurrent ? 'text-violet-600' : 'text-gray-400'}`}></i>
                        <span className={`text-[10px] font-bold ${isCurrent ? 'text-violet-700' : 'text-gray-500'}`}>
                            {categoryLabels[q.category] || 'Q'}
                        </span>

                        {/* Question number badge */}
                        <span className={`
                            absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full text-[10px] font-bold
                            flex items-center justify-center
                            ${isCurrent
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }
                        `}>
                            {q.number}
                        </span>

                        {/* Score indicator for completed questions */}
                        {isCompleted && score && (
                            <span className={`
                                absolute -bottom-1 -right-1 w-4 h-4 rounded-full
                                flex items-center justify-center
                                ${scoreColors[score]}
                            `}>
                                {score === 'strong_hire' || score === 'hire' ? (
                                    <i className="fa-solid fa-check text-white text-[8px]"></i>
                                ) : score === 'mixed' ? (
                                    <i className="fa-solid fa-minus text-white text-[8px]"></i>
                                ) : (
                                    <i className="fa-solid fa-xmark text-white text-[8px]"></i>
                                )}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default QuestionProgress;
