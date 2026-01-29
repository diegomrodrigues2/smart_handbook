import React from 'react';
import { PairChallenge, ProgrammingLanguage } from '../../types';

interface ChallengeSelectorProps {
    challenges: PairChallenge[];
    languages: { id: ProgrammingLanguage; name: string; icon: string }[];
    selectedLanguage: ProgrammingLanguage;
    onSelectLanguage: (lang: ProgrammingLanguage) => void;
    onSelectChallenge: (challenge: PairChallenge) => void;
    onClose: () => void;
    noteName: string;
}

const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
    easy: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    hard: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
};

const typeColors: Record<string, { bg: string; text: string; icon: string; label: string }> = {
    leetcode: { bg: 'from-orange-500 to-amber-500', text: 'text-orange-700', icon: 'fa-terminal', label: 'LeetCode' },
    pseudocode: { bg: 'from-purple-500 to-indigo-500', text: 'text-purple-700', icon: 'fa-diagram-project', label: 'Pseudocódigo' },
    'spark-job': { bg: 'from-orange-600 to-red-500', text: 'text-orange-700', icon: 'fa-bolt', label: 'Spark Job' },
    'sql-query': { bg: 'from-emerald-500 to-teal-600', text: 'text-emerald-700', icon: 'fa-database', label: 'SQL Query' },
    'dynamodb': { bg: 'from-blue-600 to-purple-600', text: 'text-blue-700', icon: 'fa-table', label: 'DynamoDB' }
};

// Descrições dos tipos de desafio
const typeDescriptions: Record<string, string> = {
    leetcode: 'Input/Output com testes concretos',
    pseudocode: 'Foco em conceitos, sem execução',
    'spark-job': 'ETL, agregações e transformações com Spark',
    'sql-query': 'Queries complexas, CTEs e otimização',
    'dynamodb': 'Modelagem NoSQL e design de chaves'
};

const ChallengeSelector: React.FC<ChallengeSelectorProps> = ({
    challenges,
    languages,
    selectedLanguage,
    onSelectLanguage,
    onSelectChallenge,
    onClose,
    noteName
}) => {
    // Agrupar desafios por tipo
    const challengesByType = challenges.reduce((acc, challenge) => {
        const type = challenge.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(challenge);
        return acc;
    }, {} as Record<string, PairChallenge[]>);

    return (
        <div className="h-full bg-gray-50 rounded-xl overflow-hidden flex flex-col border border-gray-200 shadow-lg">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-200">
                            <i className="fa-solid fa-laptop-code text-white text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Pair Programming</h2>
                            <p className="text-sm text-gray-500">{noteName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-2 rounded-xl hover:bg-gray-100"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            {/* Language Selector */}
            <div className="bg-white px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Escolha sua linguagem</h3>
                <div className="flex flex-wrap gap-2">
                    {languages.map(lang => (
                        <button
                            key={lang.id}
                            onClick={() => onSelectLanguage(lang.id)}
                            className={`
                                px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                                ${selectedLanguage === lang.id
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }
                            `}
                        >
                            <i className={`fa-brands ${lang.icon}`}></i>
                            {lang.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Challenges */}
            <div className="flex-1 overflow-y-auto p-6">
                {Object.entries(challengesByType).map(([type, typeChallenges]) => {
                    const typeStyle = typeColors[type] || typeColors.leetcode;
                    const typeDesc = typeDescriptions[type] || '';

                    return (
                        <div key={type} className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${typeStyle.bg} flex items-center justify-center`}>
                                    <i className={`fa-solid ${typeStyle.icon} text-white text-sm`}></i>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">{typeStyle.label}</h3>
                                <span className="text-xs text-gray-500 ml-2">{typeDesc}</span>
                            </div>
                            <div className="grid gap-3">
                                {typeChallenges.map(challenge => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        challenge={challenge}
                                        onSelect={() => onSelectChallenge(challenge)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="bg-white px-6 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex items-center gap-2">
                    <i className="fa-solid fa-lightbulb text-amber-400"></i>
                    Escolha um desafio para iniciar a sessão de pair programming com o Navigator (IA)
                </p>
            </div>
        </div>
    );
};

const ChallengeCard: React.FC<{ challenge: PairChallenge; onSelect: () => void }> = ({ challenge, onSelect }) => {
    const diffStyle = difficultyColors[challenge.difficulty];
    const typeStyle = typeColors[challenge.type] || typeColors.leetcode;

    return (
        <button
            onClick={onSelect}
            className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-cyan-300 hover:shadow-md transition-all group"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${diffStyle.bg} ${diffStyle.text}`}>
                            {challenge.difficulty}
                        </span>
                        <span className={`text-[10px] ${typeStyle.text} font-medium`}>
                            {typeStyle.label}
                        </span>
                    </div>
                    <h4 className="font-semibold text-gray-800 group-hover:text-cyan-700 transition-colors">
                        {challenge.title}
                    </h4>

                    {/* Business Context - Nova seção para contexto realista */}
                    {challenge.businessContext && (
                        <div className="mt-2 p-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                            <p className="text-xs text-blue-700 italic line-clamp-2">
                                <i className="fa-solid fa-building text-blue-400 mr-1"></i>
                                {challenge.businessContext}
                            </p>
                        </div>
                    )}

                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {challenge.description}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                        {(challenge.expectedTopics || []).slice(0, 4).map((topic, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {topic}
                            </span>
                        ))}
                        {(challenge.expectedTopics || []).length > 4 && (
                            <span className="text-[10px] text-gray-400">
                                +{challenge.expectedTopics!.length - 4}
                            </span>
                        )}
                    </div>
                </div>
                <div className="ml-4 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-cyan-50 transition-colors flex-shrink-0">
                    <i className="fa-solid fa-chevron-right text-gray-300 group-hover:text-cyan-500 transition-colors"></i>
                </div>
            </div>
        </button>
    );
};

export default ChallengeSelector;
