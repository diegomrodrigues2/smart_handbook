import React from 'react';
import { InterviewSession } from '../../types';

interface FinalVerdictProps {
    session: InterviewSession;
}

const scoreDetails: Record<string, { label: string; gradient: string; icon: string; description: string }> = {
    'strong_hire': {
        label: 'FORTE CONTRATAÇÃO',
        gradient: 'from-emerald-500 to-green-600',
        icon: 'fa-trophy',
        description: 'Excelente desempenho! Demonstrou profundidade consistente em todas as áreas.'
    },
    'hire': {
        label: 'CONTRATAÇÃO',
        gradient: 'from-green-400 to-emerald-500',
        icon: 'fa-thumbs-up',
        description: 'Bom desempenho. Conhecimento sólido na maioria das áreas avaliadas.'
    },
    'mixed': {
        label: 'MISTO / TALVEZ',
        gradient: 'from-amber-400 to-orange-500',
        icon: 'fa-scale-balanced',
        description: 'Desempenho variável. Algumas lacunas identificadas que podem ser desenvolvidas.'
    },
    'no_hire': {
        label: 'NÃO CONTRATAR',
        gradient: 'from-red-400 to-rose-500',
        icon: 'fa-circle-xmark',
        description: 'Gaps significativos em conhecimento fundamental foram identificados.'
    }
};

const FinalVerdict: React.FC<FinalVerdictProps> = ({ session }) => {
    if (!session.finalVerdict) return null;

    const verdict = session.finalVerdict;
    const details = scoreDetails[verdict.overallScore] || scoreDetails['mixed'];

    // Calculate stats
    const totalQuestions = session.questions.length;
    const answeredQuestions = session.questions.filter(q => q.answered).length;

    const avgDepth = session.questions
        .filter(q => q.evaluation)
        .reduce((sum, q) => sum + (q.evaluation?.dimensions.depth || 0), 0) / answeredQuestions || 0;

    const avgTradeoffs = session.questions
        .filter(q => q.evaluation)
        .reduce((sum, q) => sum + (q.evaluation?.dimensions.tradeoffs || 0), 0) / answeredQuestions || 0;

    const avgCommunication = session.questions
        .filter(q => q.evaluation)
        .reduce((sum, q) => sum + (q.evaluation?.dimensions.communication || 0), 0) / answeredQuestions || 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Header with Result */}
            <div className={`bg-gradient-to-r ${details.gradient} p-6 text-white`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <i className={`fa-solid ${details.icon} text-3xl`}></i>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Resultado Final</div>
                            <h2 className="text-2xl font-bold">{details.label}</h2>
                            <p className="text-sm opacity-90 mt-1">{details.description}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-bold">{answeredQuestions}/{totalQuestions}</div>
                        <div className="text-xs opacity-80">Questões Respondidas</div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-100">
                <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600">{avgDepth.toFixed(1)}/4</div>
                    <div className="text-xs text-gray-500 mt-1">Profundidade Média</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{avgTradeoffs.toFixed(1)}/4</div>
                    <div className="text-xs text-gray-500 mt-1">Trade-offs Média</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{avgCommunication.toFixed(1)}/4</div>
                    <div className="text-xs text-gray-500 mt-1">Comunicação Média</div>
                </div>
            </div>

            {/* Summary and Recommendation */}
            <div className="p-6 space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-file-lines text-violet-500"></i>
                        Resumo da Avaliação
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                        {verdict.summary}
                    </p>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-compass text-indigo-500"></i>
                        Recomendação
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        {verdict.recommendation}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FinalVerdict;
