import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ExerciseCardProps } from './types';
import SolutionView from './SolutionView';

const difficultyConfig = {
    easy: {
        label: 'Fácil',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
    },
    medium: {
        label: 'Médio',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200'
    },
    hard: {
        label: 'Difícil',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
    }
};

interface OptionButtonProps {
    label: string;
    text: string;
    isSelected: boolean;
    isCorrect?: boolean;
    showResult: boolean;
    onClick: () => void;
    disabled: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({
    label,
    text,
    isSelected,
    isCorrect,
    showResult,
    onClick,
    disabled
}) => {
    let buttonClasses = 'w-full text-left p-3 rounded-lg border-2 transition-all flex items-start gap-3 ';

    if (showResult) {
        if (isCorrect) {
            buttonClasses += 'bg-green-50 border-green-500 text-green-800';
        } else if (isSelected && !isCorrect) {
            buttonClasses += 'bg-red-50 border-red-500 text-red-800';
        } else {
            buttonClasses += 'bg-gray-50 border-gray-200 text-gray-500';
        }
    } else if (isSelected) {
        buttonClasses += 'bg-teal-50 border-teal-500 text-teal-800';
    } else {
        buttonClasses += 'bg-white border-gray-200 text-gray-700 hover:border-teal-300 hover:bg-teal-50/50';
    }

    if (disabled) {
        buttonClasses += ' cursor-not-allowed';
    } else {
        buttonClasses += ' cursor-pointer';
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={buttonClasses}
        >
            <span className={`
                flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm
                ${showResult && isCorrect ? 'bg-green-500 text-white' : ''}
                ${showResult && isSelected && !isCorrect ? 'bg-red-500 text-white' : ''}
                ${!showResult && isSelected ? 'bg-teal-500 text-white' : ''}
                ${!showResult && !isSelected ? 'bg-gray-200 text-gray-600' : ''}
                ${showResult && !isCorrect && !isSelected ? 'bg-gray-200 text-gray-400' : ''}
            `}>
                {showResult && isCorrect && <i className="fa-solid fa-check text-xs"></i>}
                {showResult && isSelected && !isCorrect && <i className="fa-solid fa-xmark text-xs"></i>}
                {!showResult && label}
                {showResult && !isCorrect && !isSelected && label}
            </span>
            <span className="flex-1 leading-relaxed text-sm">
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        p: ({ node, ...props }) => <span {...props} />,
                        code: ({ node, ...props }) => (
                            <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs" {...props} />
                        )
                    }}
                >
                    {text}
                </ReactMarkdown>
            </span>
        </button>
    );
};

const ExerciseCard: React.FC<ExerciseCardProps> = ({
    exercise,
    onToggleSolution,
    onGenerateSolution,
    currentSolutionStream,
    isStreaming,
    onSelectAnswer
}) => {
    const difficulty = difficultyConfig[exercise.difficulty];
    const isThisStreaming = isStreaming && exercise.isGeneratingSolution;
    const hasSolution = !!exercise.solution;
    const isMultipleChoice = exercise.questionType === 'multiple-choice' && exercise.options && exercise.options.length > 0;
    const isMultipleResponse = exercise.responseFormat === 'multiple';
    const selectedAnswers = exercise.selectedAnswers || [];
    const correctAnswers = exercise.correctAnswers || [];
    const showResult = hasSolution && correctAnswers.length > 0;

    const handleSolutionClick = () => {
        if (hasSolution) {
            onToggleSolution(exercise.id);
        } else {
            onGenerateSolution(exercise.id);
        }
    };

    const handleOptionClick = (label: string) => {
        if (hasSolution || isThisStreaming) return;

        if (onSelectAnswer) {
            let newSelected: string[];

            if (isMultipleResponse) {
                // Multiple selection mode
                if (selectedAnswers.includes(label)) {
                    newSelected = selectedAnswers.filter(l => l !== label);
                } else {
                    // Limit to selectCount
                    const maxSelect = exercise.selectCount || 2;
                    if (selectedAnswers.length >= maxSelect) {
                        // Remove first selected and add new one
                        newSelected = [...selectedAnswers.slice(1), label];
                    } else {
                        newSelected = [...selectedAnswers, label];
                    }
                }
            } else {
                // Single selection mode
                newSelected = selectedAnswers.includes(label) ? [] : [label];
            }

            onSelectAnswer(exercise.id, newSelected);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {exercise.number}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{exercise.topic}</span>
                    {isMultipleChoice && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                            {isMultipleResponse
                                ? `Selecione ${exercise.selectCount || 2}`
                                : 'Múltipla Escolha'}
                        </span>
                    )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${difficulty.bgColor} ${difficulty.textColor} border ${difficulty.borderColor}`}>
                    {difficulty.label}
                </span>
            </div>

            {/* Statement */}
            <div className="px-5 py-4">
                <div className="prose prose-sm max-w-none text-gray-800">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({ node, ...props }) => <p className="mb-3 leading-relaxed text-base" {...props} />,
                            code: ({ node, ...props }) => (
                                <code className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-sm" {...props} />
                            )
                        }}
                    >
                        {exercise.statement}
                    </ReactMarkdown>
                </div>
            </div>

            {/* Multiple Choice Options */}
            {isMultipleChoice && exercise.options && (
                <div className="px-5 pb-4 space-y-2">
                    {exercise.options.map((option) => (
                        <OptionButton
                            key={option.label}
                            label={option.label}
                            text={option.text}
                            isSelected={selectedAnswers.includes(option.label)}
                            isCorrect={correctAnswers.includes(option.label)}
                            showResult={showResult}
                            onClick={() => handleOptionClick(option.label)}
                            disabled={hasSolution || isThisStreaming}
                        />
                    ))}

                    {/* Selection counter for multiple response */}
                    {isMultipleResponse && !hasSolution && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                            <i className="fa-solid fa-info-circle mr-1"></i>
                            {selectedAnswers.length} de {exercise.selectCount || 2} selecionadas
                        </div>
                    )}
                </div>
            )}

            {/* Solution Button & Content */}
            <div className="px-5 pb-4">
                <button
                    onClick={handleSolutionClick}
                    disabled={isThisStreaming}
                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${exercise.isExpanded || isThisStreaming
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:from-teal-600 hover:to-emerald-600 shadow-sm'
                        } disabled:opacity-70`}
                >
                    {isThisStreaming ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>Gerando Gabarito...</span>
                        </>
                    ) : exercise.isExpanded ? (
                        <>
                            <i className="fa-solid fa-chevron-up"></i>
                            <span>Ocultar Gabarito</span>
                        </>
                    ) : hasSolution ? (
                        <>
                            <i className="fa-solid fa-chevron-down"></i>
                            <span>Ver Gabarito</span>
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            <span>{isMultipleChoice ? 'Verificar Resposta' : 'Gerar Solução'}</span>
                        </>
                    )}
                </button>

                {/* Solution View */}
                {(exercise.isExpanded || isThisStreaming) && (
                    <SolutionView
                        solution={exercise.solution || ''}
                        isStreaming={isThisStreaming}
                        streamingContent={currentSolutionStream}
                    />
                )}
            </div>
        </div>
    );
};

export default ExerciseCard;
