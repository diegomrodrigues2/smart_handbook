import React from 'react';
import { LearningSession } from '../../types';

interface InputAreaProps {
    session: LearningSession;
    input: string;
    isThinking: boolean;
    complexityLevel: 1 | 2 | 3;
    hasActiveProblem: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onSolveStepByStep: () => void;
    onPreviousConcept: () => void;
    onSkipConcept: () => void;
    onIncreaseComplexity: () => void;
}

const InputArea: React.FC<InputAreaProps> = ({
    session,
    input,
    isThinking,
    complexityLevel,
    hasActiveProblem,
    onInputChange,
    onSend,
    onSolveStepByStep,
    onPreviousConcept,
    onSkipConcept,
    onIncreaseComplexity
}) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm border-t border-indigo-100 p-4">
            <div className="flex gap-2 mb-3">
                <button
                    onClick={onSolveStepByStep}
                    disabled={isThinking || !hasActiveProblem}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${!hasActiveProblem
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                >
                    <i className="fa-solid fa-list-check"></i>
                    Resolver Passo a Passo
                </button>
                <button
                    onClick={onPreviousConcept}
                    disabled={session.currentConceptIndex === 0}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${session.currentConceptIndex === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                >
                    <i className="fa-solid fa-backward"></i>
                    Conceito Anterior
                </button>
                <button
                    onClick={onSkipConcept}
                    disabled={session.currentConceptIndex === session.concepts.length - 1}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${session.currentConceptIndex === session.concepts.length - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                >
                    <i className="fa-solid fa-forward"></i>
                    Próximo Conceito
                </button>
                <button
                    onClick={onIncreaseComplexity}
                    disabled={isThinking || complexityLevel >= 3}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1 ${complexityLevel >= 3
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                    title="Aumentar complexidade dos exemplos"
                >
                    <i className="fa-solid fa-arrow-up"></i>
                    Mais Avançado
                </button>
                <div className="flex-1"></div>
                <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                        <i className="fa-solid fa-chart-line"></i>
                        Suporte: {session.supportLevel}/4
                    </span>
                    <span className="text-purple-500 flex items-center gap-1">
                        <i className="fa-solid fa-layer-group"></i>
                        Nível: {complexityLevel === 1 ? 'Básico' : complexityLevel === 2 ? 'Intermediário' : 'Avançado'}
                    </span>
                </div>
            </div>

            <div className="relative">
                <textarea
                    className="w-full resize-none border border-indigo-200 rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white/50"
                    rows={2}
                    placeholder="Digite sua resposta..."
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isThinking}
                />
                <button
                    onClick={onSend}
                    disabled={isThinking || !input.trim()}
                    className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${input.trim() && !isThinking
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md'
                        : 'bg-gray-200 text-gray-400'
                        }`}
                >
                    <i className="fa-solid fa-paper-plane text-sm"></i>
                </button>
            </div>
        </div>
    );
};

export default InputArea;
