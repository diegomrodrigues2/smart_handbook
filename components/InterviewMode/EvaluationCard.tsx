import React from 'react';
import { InterviewEvaluation } from '../../types';

interface EvaluationCardProps {
    evaluation: InterviewEvaluation;
    questionNumber: number;
}

const scoreLabels: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
    'strong_hire': { label: 'Forte Contratação', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: 'fa-star' },
    'hire': { label: 'Contratação', color: 'text-green-700', bgColor: 'bg-green-100', icon: 'fa-thumbs-up' },
    'mixed': { label: 'Misto / Talvez', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: 'fa-scale-balanced' },
    'no_hire': { label: 'Não Contratar', color: 'text-red-700', bgColor: 'bg-red-100', icon: 'fa-thumbs-down' }
};

const EvaluationCard: React.FC<EvaluationCardProps> = ({ evaluation, questionNumber }) => {
    const scoreInfo = scoreLabels[evaluation.score] || scoreLabels['mixed'];

    const getDimensionColor = (value: number): string => {
        if (value >= 4) return 'bg-emerald-500';
        if (value >= 3) return 'bg-green-400';
        if (value >= 2) return 'bg-amber-400';
        return 'bg-red-400';
    };

    return (
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border border-gray-200 p-5 shadow-sm">
            {/* Header with Score */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">
                    Avaliação da Questão {questionNumber}
                </h3>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${scoreInfo.bgColor}`}>
                    <i className={`fa-solid ${scoreInfo.icon} text-xs ${scoreInfo.color}`}></i>
                    <span className={`text-xs font-bold ${scoreInfo.color}`}>{scoreInfo.label}</span>
                </div>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Profundidade</div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${getDimensionColor(evaluation.dimensions.depth)} transition-all`}
                                style={{ width: `${(evaluation.dimensions.depth / 4) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{evaluation.dimensions.depth}/4</span>
                    </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Trade-offs</div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${getDimensionColor(evaluation.dimensions.tradeoffs)} transition-all`}
                                style={{ width: `${(evaluation.dimensions.tradeoffs / 4) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{evaluation.dimensions.tradeoffs}/4</span>
                    </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Comunicação</div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${getDimensionColor(evaluation.dimensions.communication)} transition-all`}
                                style={{ width: `${(evaluation.dimensions.communication / 4) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{evaluation.dimensions.communication}/4</span>
                    </div>
                </div>
            </div>

            {/* Feedback */}
            <div className="bg-white rounded-lg p-3 border border-gray-100 mb-3">
                <div className="text-xs text-gray-600 leading-relaxed">{evaluation.feedback}</div>
            </div>

            {/* Strengths and Improvements */}
            <div className="grid grid-cols-2 gap-3">
                {evaluation.strengths.length > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <div className="flex items-center gap-1.5 mb-2">
                            <i className="fa-solid fa-check-circle text-emerald-500 text-xs"></i>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Pontos Fortes</span>
                        </div>
                        <ul className="space-y-1">
                            {evaluation.strengths.map((s, i) => (
                                <li key={i} className="text-[11px] text-emerald-700 flex items-start gap-1.5">
                                    <span className="text-emerald-400 mt-0.5">•</span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {evaluation.improvements.length > 0 && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <div className="flex items-center gap-1.5 mb-2">
                            <i className="fa-solid fa-lightbulb text-amber-500 text-xs"></i>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Melhorias</span>
                        </div>
                        <ul className="space-y-1">
                            {evaluation.improvements.map((s, i) => (
                                <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1.5">
                                    <span className="text-amber-400 mt-0.5">•</span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationCard;
