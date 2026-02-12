import React from 'react';
import { ConceptSuggestion } from '../../types';

interface SuggestionBarProps {
    suggestions: ConceptSuggestion[];
    onAcceptSuggestion: (suggestion: ConceptSuggestion) => void;
    isLoading?: boolean;
    loadingSuggestionId?: string | null;
}

const SECTION_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
    'tradeoffs': { icon: 'fa-solid fa-scale-balanced', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    'code-example': { icon: 'fa-solid fa-code', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    'diagram': { icon: 'fa-solid fa-diagram-project', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    'implementation-guide': { icon: 'fa-solid fa-list-check', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
    'deep-dive': { icon: 'fa-solid fa-magnifying-glass-plus', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
    'use-cases': { icon: 'fa-solid fa-lightbulb', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
    'comparison': { icon: 'fa-solid fa-arrows-left-right', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' },
};

const DEFAULT_STYLE = { icon: 'fa-solid fa-plus', color: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100' };

const SuggestionBar: React.FC<SuggestionBarProps> = ({
    suggestions,
    onAcceptSuggestion,
    isLoading = false,
    loadingSuggestionId = null
}) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-wand-magic-sparkles text-indigo-500 text-sm"></i>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Suggested Sections
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => {
                        const style = SECTION_TYPE_ICONS[suggestion.sectionType] || DEFAULT_STYLE;
                        const isThisLoading = loadingSuggestionId === suggestion.id;

                        return (
                            <button
                                key={suggestion.id}
                                onClick={() => onAcceptSuggestion(suggestion)}
                                disabled={isLoading}
                                className={`
                                    inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium
                                    transition-all duration-200 shadow-sm
                                    ${isThisLoading ? 'animate-pulse' : ''}
                                    ${style.color}
                                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}
                                `}
                                title={suggestion.description}
                            >
                                {isThisLoading ? (
                                    <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                                ) : (
                                    <i className={`${style.icon} text-xs`}></i>
                                )}
                                <span>{suggestion.title}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SuggestionBar;
