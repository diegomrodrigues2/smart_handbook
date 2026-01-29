import React from 'react';
import { LearningSession, SuggestedProblem } from '../../types';

interface ConceptNavigatorProps {
    session: LearningSession;
    currentConcept: LearningSession['concepts'][0] | undefined;
    suggestedProblems: SuggestedProblem[];
    showProblemSelector: boolean;
    isThinking: boolean;
    onSwitchConcept: (index: number) => void;
    onSelectProblem: (problem: SuggestedProblem) => void;
    onToggleProblemSelector: () => void;
}

const ConceptNavigator: React.FC<ConceptNavigatorProps> = ({
    session,
    currentConcept,
    suggestedProblems,
    showProblemSelector,
    isThinking,
    onSwitchConcept,
    onSelectProblem,
    onToggleProblemSelector
}) => {
    return (
        <>
            {/* Progress Bar */}
            <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progresso</span>
                    <span>{session.currentConceptIndex}/{session.concepts.length} conceitos</span>
                </div>
                <div className="h-2 bg-indigo-100 rounded-full overflow-hidden flex gap-0.5">
                    {session.concepts.map((c, i) => (
                        <button
                            key={c.id}
                            onClick={() => onSwitchConcept(i)}
                            className={`h-full transition-all duration-300 ${i === session.currentConceptIndex
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                : c.completed
                                    ? 'bg-indigo-300'
                                    : 'bg-indigo-100 hover:bg-indigo-200'
                                }`}
                            style={{ width: `${100 / session.concepts.length}%` }}
                            title={c.title}
                        />
                    ))}
                </div>
            </div>

            {/* Current Concept & Problem Switcher */}
            {currentConcept && (
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-3 border border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-lightbulb text-amber-500 text-sm"></i>
                        <span className="text-xs font-semibold text-indigo-700">Conceito Atual</span>
                        <span className="ml-auto text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">
                            Suporte: {session.supportLevel}/4
                        </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 leading-tight mb-1 truncate" title={currentConcept.title}>{currentConcept.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3 px-1" title={currentConcept.description}>{currentConcept.description}</p>

                    {/* Persistent Mini Switcher */}
                    {suggestedProblems.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-200/50">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter mr-1">Exercícios:</span>
                            {suggestedProblems.map((prob, idx) => {
                                const isActive = currentConcept.activeProblemId === prob.id;
                                const hasHistory = currentConcept.problemSessions?.[prob.id];

                                return (
                                    <button
                                        key={prob.id}
                                        onClick={() => onSelectProblem(prob)}
                                        disabled={isThinking && !isActive}
                                        title={prob.title}
                                        className={`h-7 px-3 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${isActive
                                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                                            : 'bg-white border border-indigo-100 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50'
                                            }`}
                                    >
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${isActive ? 'bg-white/20' : 'bg-indigo-100'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className="max-w-[80px] truncate">{prob.title}</span>
                                        {hasHistory && !isActive && <div className="w-1 h-1 rounded-full bg-green-500"></div>}
                                    </button>
                                );
                            })}
                            <button
                                onClick={onToggleProblemSelector}
                                className="ml-auto text-[10px] text-indigo-500 hover:text-indigo-700 font-bold hover:underline"
                            >
                                Ver Banco Completo
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ConceptNavigator;
