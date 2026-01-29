import React, { useState } from 'react';
import { LessonPlan } from '../../types';
import { LessonPlanViewProps } from './types';

const sectionTypeIcons: Record<string, string> = {
    introduction: 'fa-door-open',
    explanation: 'fa-book',
    example: 'fa-lightbulb',
    practice: 'fa-pencil',
    discussion: 'fa-comments',
    conclusion: 'fa-flag-checkered'
};

const sectionTypeColors: Record<string, string> = {
    introduction: 'bg-blue-100 text-blue-700 border-blue-200',
    explanation: 'bg-purple-100 text-purple-700 border-purple-200',
    example: 'bg-amber-100 text-amber-700 border-amber-200',
    practice: 'bg-green-100 text-green-700 border-green-200',
    discussion: 'bg-pink-100 text-pink-700 border-pink-200',
    conclusion: 'bg-indigo-100 text-indigo-700 border-indigo-200'
};

const sectionTypeLabels: Record<string, string> = {
    introduction: 'Introdução',
    explanation: 'Teoria',
    example: 'Exemplo',
    practice: 'Prática',
    discussion: 'Discussão',
    conclusion: 'Conclusão'
};

const LessonPlanView: React.FC<LessonPlanViewProps> = ({
    plan,
    isLoading,
    onApprove,
    onRegenerate,
    onRefineWithFeedback
}) => {
    const [feedback, setFeedback] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const handleSendFeedback = async () => {
        if (!feedback.trim() || isLoading || isRefining) return;

        setIsRefining(true);
        await onRefineWithFeedback(feedback);
        setFeedback('');
        setIsRefining(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendFeedback();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{plan.title}</h2>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                        <i className="fa-regular fa-clock"></i>
                        {plan.duration}
                    </span>
                    <span className="flex items-center gap-1">
                        <i className="fa-solid fa-list-check"></i>
                        {plan.sections.length} seções
                    </span>
                </div>
            </div>

            {/* Objectives */}
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <h3 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-bullseye"></i>
                    Objetivos de Aprendizagem
                </h3>
                <ul className="space-y-2">
                    {plan.objectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            {obj}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Sections Timeline */}
            <div className="flex-1 overflow-y-auto mb-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-timeline"></i>
                    Cronograma da Aula
                </h3>
                <div className="space-y-3">
                    {plan.sections.map((section, idx) => (
                        <div
                            key={section.id}
                            className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${sectionTypeColors[section.type]}`}>
                                <i className={`fa-solid ${sectionTypeIcons[section.type]}`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-gray-800">
                                        {idx + 1}. {section.title}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sectionTypeColors[section.type]}`}>
                                        {sectionTypeLabels[section.type]}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-2">{section.description}</p>
                            </div>
                            <div className="text-sm font-medium text-gray-400 whitespace-nowrap">
                                {section.duration}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Feedback Input */}
            <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
                <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-message"></i>
                    Solicitar alterações no plano
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ex: Adicione mais exemplos práticos, reduza a parte teórica..."
                        disabled={isLoading || isRefining}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-gray-100 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSendFeedback}
                        disabled={!feedback.trim() || isLoading || isRefining}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isRefining ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fa-solid fa-paper-plane"></i>
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    Descreva as alterações desejadas e pressione Enter ou clique no botão
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                    onClick={onRegenerate}
                    disabled={isLoading || isRefining}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <i className="fa-solid fa-arrows-rotate"></i>
                    Gerar Novo Plano
                </button>
                <button
                    onClick={onApprove}
                    disabled={isLoading || isRefining}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                    <i className="fa-solid fa-check"></i>
                    Aprovar e Gerar Aula
                </button>
            </div>
        </div>
    );
};

export default LessonPlanView;
