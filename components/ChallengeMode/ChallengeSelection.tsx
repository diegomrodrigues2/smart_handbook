import React, { useState } from 'react';
import { Challenge } from '../../types';

interface ChallengeSelectionProps {
    alternatives: Challenge[];
    onSelect: (challenge: Challenge) => void;
    onCustomChallenge: (suggestion: string) => void;
    isGeneratingCustom?: boolean;
}

const ChallengeSelection: React.FC<ChallengeSelectionProps> = ({
    alternatives,
    onSelect,
    onCustomChallenge,
    isGeneratingCustom = false
}) => {
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customSuggestion, setCustomSuggestion] = useState('');

    const handleSubmitCustom = () => {
        if (customSuggestion.trim()) {
            onCustomChallenge(customSuggestion.trim());
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="text-center mb-10">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Escalando o conhecimento</h3>
                <p className="text-gray-500">Escolha um dos cenários abaixo para testar suas habilidades em design.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {alternatives.map((challenge, index) => (
                    <div
                        key={challenge.id}
                        className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col relative overflow-hidden active:scale-[0.98]"
                        onClick={() => onSelect(challenge)}
                    >
                        {/* Decorative background element */}
                        <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-150 ${challenge.type === 'System Design' ? 'bg-indigo-600' : 'bg-emerald-600'}`}></div>

                        <div className="flex items-start justify-between mb-4">
                            <span className={`text-[10px] uppercase tracking-[0.1em] font-black px-2.5 py-1 rounded-lg border ${challenge.type === 'System Design'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                {challenge.type}
                            </span>
                            <span className="text-gray-300 font-mono text-sm">0{index + 1}</span>
                        </div>

                        <h4 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-indigo-600 transition-colors">
                            {challenge.title}
                        </h4>

                        <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">
                            {challenge.description}
                        </p>

                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider group-hover:gap-3 transition-all">
                            Começar Desafio
                            <i className="fa-solid fa-arrow-right"></i>
                        </div>
                    </div>
                ))}

                {/* Custom Challenge Card */}
                <div
                    className={`group bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-dashed border-amber-300 p-6 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all cursor-pointer flex flex-col relative overflow-hidden ${showCustomInput ? 'col-span-full' : ''}`}
                    onClick={() => !showCustomInput && setShowCustomInput(true)}
                >
                    {/* Decorative background element */}
                    <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-amber-500 opacity-10 transition-transform group-hover:scale-150"></div>

                    <div className="flex items-start justify-between mb-4">
                        <span className="text-[10px] uppercase tracking-[0.1em] font-black px-2.5 py-1 rounded-lg border bg-amber-100 text-amber-700 border-amber-200">
                            Personalizado
                        </span>
                        <span className="text-amber-300 font-mono text-sm">
                            <i className="fa-solid fa-wand-sparkles"></i>
                        </span>
                    </div>

                    <h4 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-amber-600 transition-colors">
                        <i className="fa-solid fa-plus-circle mr-2 text-amber-500"></i>
                        Sugerir Meu Próprio Desafio
                    </h4>

                    {!showCustomInput ? (
                        <>
                            <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">
                                Tem um tema específico em mente? Sugira um desafio personalizado baseado no conteúdo que você está estudando.
                            </p>
                            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider group-hover:gap-3 transition-all">
                                Criar Desafio
                                <i className="fa-solid fa-arrow-right"></i>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Descreva o tema ou contexto do desafio que você gostaria de realizar. Por exemplo:
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span
                                    className="px-3 py-1.5 bg-white border border-amber-200 rounded-full text-amber-700 cursor-pointer hover:bg-amber-100 transition-colors"
                                    onClick={() => setCustomSuggestion("Quero ser avaliado sobre o design de um Load Balancer distribuído")}
                                >
                                    Load Balancer Design
                                </span>
                                <span
                                    className="px-3 py-1.5 bg-white border border-amber-200 rounded-full text-amber-700 cursor-pointer hover:bg-amber-100 transition-colors"
                                    onClick={() => setCustomSuggestion("Quero um desafio de System Design sobre cache distribuído")}
                                >
                                    Cache Distribuído
                                </span>
                                <span
                                    className="px-3 py-1.5 bg-white border border-amber-200 rounded-full text-amber-700 cursor-pointer hover:bg-amber-100 transition-colors"
                                    onClick={() => setCustomSuggestion("Quero um desafio de Low Level Design focado em estruturas de dados")}
                                >
                                    Estruturas de Dados
                                </span>
                            </div>
                            <textarea
                                value={customSuggestion}
                                onChange={(e) => setCustomSuggestion(e.target.value)}
                                placeholder="Ex: Quero ser avaliado sobre o design de Load Balancing no contexto de System Design..."
                                className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                                rows={3}
                                disabled={isGeneratingCustom}
                            />
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleSubmitCustom}
                                    disabled={!customSuggestion.trim() || isGeneratingCustom}
                                    className="flex-1 px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isGeneratingCustom ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                            Gerando Desafio...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                            Gerar Meu Desafio
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCustomInput(false);
                                        setCustomSuggestion('');
                                    }}
                                    disabled={isGeneratingCustom}
                                    className="px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-12 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fa-solid fa-lightbulb"></i>
                </div>
                <div className="text-sm">
                    <p className="font-bold text-indigo-900 mb-1">Dica de Especialista:</p>
                    <p className="text-indigo-800/80">Estes desafios são projetados com **ambiguidade intencional**. Não comece a projetar imediatamente; pergunte sobre requisitos funcionais e não-funcionais primeiro para demonstrar senioridade.</p>
                </div>
            </div>
        </div>
    );
};

export default ChallengeSelection;
