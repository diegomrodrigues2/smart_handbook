import React from 'react';
import { Challenge } from '../../types';

interface ChallengeDetailProps {
    challenge: Challenge;
    onStart: () => void;
    onBack: () => void;
}

const ChallengeDetail: React.FC<ChallengeDetailProps> = ({ challenge, onStart, onBack }) => {
    return (
        <div className="max-w-3xl mx-auto py-12 px-6">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors mb-8 group"
            >
                <i className="fa-solid fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                <span className="text-sm font-semibold">Voltar para a seleção</span>
            </button>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header Decoration */}
                <div className={`h-3 ${challenge.type === 'System Design' ? 'bg-indigo-600' : 'bg-emerald-600'}`}></div>

                <div className="p-8 md:p-12">
                    <div className="flex items-center gap-3 mb-6">
                        <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full border ${challenge.type === 'System Design'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                            {challenge.type}
                        </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 leading-tight">
                        {challenge.title}
                    </h2>

                    <div className="space-y-8">
                        <section>
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-3 flex items-center gap-2">
                                <i className="fa-solid fa-circle-info text-[8px]"></i>
                                Visão Geral
                            </h4>
                            <p className="text-lg text-gray-600 leading-relaxed">
                                {challenge.description}
                            </p>
                        </section>

                        <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-terminal text-[8px]"></i>
                                Enunciado do Desafio
                            </h4>
                            <div className="text-2xl font-serif italic text-gray-800 leading-snug">
                                "{challenge.ambiguousPrompt}"
                            </div>
                        </section>

                        <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center gap-6">
                            <button
                                onClick={onStart}
                                className="flex-1 w-full bg-indigo-600 text-white text-lg font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                            >
                                Iniciar Entrevista Técnica
                                <i className="fa-solid fa-bolt"></i>
                            </button>
                            <div className="flex flex-col gap-1 text-center md:text-left">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Nível Sugerido</span>
                                <span className="text-sm font-black text-gray-700">Sênior / Staff Engineer</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/50 border border-white p-4 rounded-2xl flex items-center gap-3">
                    <i className="fa-solid fa-clock text-amber-500"></i>
                    <span className="text-xs font-semibold text-gray-600">45-60 min sugeridos</span>
                </div>
                <div className="bg-white/50 border border-white p-4 rounded-2xl flex items-center gap-3">
                    <i className="fa-solid fa-comments text-blue-500"></i>
                    <span className="text-xs font-semibold text-gray-600">Feedback em tempo real</span>
                </div>
                <div className="bg-white/50 border border-white p-4 rounded-2xl flex items-center gap-3">
                    <i className="fa-solid fa-award text-purple-500"></i>
                    <span className="text-xs font-semibold text-gray-600">Avaliação de senioridade</span>
                </div>
            </div>
        </div>
    );
};

export default ChallengeDetail;
