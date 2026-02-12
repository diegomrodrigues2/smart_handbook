import React, { useState, useRef, useEffect } from 'react';

import { SubjectMode } from '../types';

interface StudyMode {
    id: string;
    label: string;
    description: string;
    icon: string;
    gradient: string;
    borderColor: string;
    textColor: string;
    onClick: () => void;
    advancedModeOnly?: boolean;
}

interface StudyModesMenuProps {
    onStartLearning?: () => void;
    onStartLesson?: () => void;
    onStartWorkbook?: () => void;
    onStartChallenge?: () => void;
    onStartInterview?: () => void;
    onStartPairProgramming?: () => void;
    onStartConceptExtraction?: () => void;
    mode: SubjectMode;
}

const StudyModesMenu: React.FC<StudyModesMenuProps> = ({
    onStartLearning,
    onStartLesson,
    onStartWorkbook,
    onStartChallenge,
    onStartInterview,
    onStartPairProgramming,
    onStartConceptExtraction,
    mode
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isAdvancedMode = mode === 'computing' || mode === 'data-engineering';

    const modes: StudyMode[] = [
        ...(onStartLearning ? [{
            id: 'learning',
            label: 'Aprender',
            description: 'Modo socrático interativo',
            icon: 'fa-graduation-cap',
            gradient: 'from-indigo-500 to-purple-500',
            borderColor: 'border-indigo-200',
            textColor: 'text-indigo-600',
            onClick: () => { onStartLearning(); setIsOpen(false); }
        }] : []),
        ...(onStartLesson ? [{
            id: 'lesson',
            label: 'Gerar Aula',
            description: 'Aula acadêmica estruturada',
            icon: 'fa-chalkboard-teacher',
            gradient: 'from-purple-500 to-pink-500',
            borderColor: 'border-purple-200',
            textColor: 'text-purple-600',
            onClick: () => { onStartLesson(); setIsOpen(false); }
        }] : []),
        ...(onStartWorkbook ? [{
            id: 'workbook',
            label: 'Exercícios',
            description: 'Lista de problemas práticos',
            icon: 'fa-list-check',
            gradient: 'from-teal-500 to-emerald-500',
            borderColor: 'border-teal-200',
            textColor: 'text-teal-600',
            onClick: () => { onStartWorkbook(); setIsOpen(false); }
        }] : []),
        ...(onStartChallenge && isAdvancedMode ? [{
            id: 'challenge',
            label: 'Desafio',
            description: 'System Design & LLD',
            icon: 'fa-trophy',
            gradient: 'from-amber-500 to-orange-500',
            borderColor: 'border-amber-200',
            textColor: 'text-amber-600',
            onClick: () => { onStartChallenge(); setIsOpen(false); },
            advancedModeOnly: true
        }] : []),
        ...(onStartInterview && isAdvancedMode ? [{
            id: 'interview',
            label: 'Entrevista',
            description: 'Entrevista técnica conceitual',
            icon: 'fa-user-tie',
            gradient: 'from-violet-500 to-purple-600',
            borderColor: 'border-violet-200',
            textColor: 'text-violet-600',
            onClick: () => { onStartInterview(); setIsOpen(false); },
            advancedModeOnly: true
        }] : []),
        ...(onStartPairProgramming && isAdvancedMode ? [{
            id: 'pair-programming',
            label: 'Pair Programming',
            description: 'Resolva desafios com o Navigator',
            icon: 'fa-laptop-code',
            gradient: 'from-cyan-500 to-blue-600',
            borderColor: 'border-cyan-200',
            textColor: 'text-cyan-600',
            onClick: () => { onStartPairProgramming(); setIsOpen(false); },
            advancedModeOnly: true
        }] : []),
        ...(onStartConceptExtraction ? [{
            id: 'concept-extraction',
            label: 'Extração de Conceitos',
            description: 'Gera definições a partir do conteúdo',
            icon: 'fa-lightbulb',
            gradient: 'from-amber-400 to-yellow-500',
            borderColor: 'border-amber-200',
            textColor: 'text-amber-700',
            onClick: () => { onStartConceptExtraction(); setIsOpen(false); }
        }] : [])
    ];

    if (modes.length === 0) return null;

    return (
        <div className="relative" ref={menuRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    text-xs border rounded-lg px-3 py-1.5 mr-2 transition-all font-medium flex items-center gap-2
                    ${isOpen
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent shadow-lg shadow-indigo-200'
                        : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200 hover:from-indigo-100 hover:to-purple-100'
                    }
                `}
            >
                <i className="fa-solid fa-rocket"></i>
                <span>Modos de Estudo</span>
                <i className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {/* Dropdown Menu */}
            <div className={`
                absolute right-0 top-full mt-2 z-50
                bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-200/50
                min-w-[280px] overflow-hidden
                transition-all duration-200 origin-top-right
                ${isOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }
            `}>
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <i className="fa-solid fa-sparkles text-amber-500"></i>
                        Escolha um modo
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Interaja com o conteúdo de diferentes formas</p>
                </div>

                {/* Modes List */}
                <div className="p-2 space-y-1">
                    {modes.map((indexMode, index) => (
                        <button
                            key={indexMode.id}
                            onClick={indexMode.onClick}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                transition-all duration-150 group
                                hover:bg-gray-50 active:scale-[0.98]
                            `}
                            style={{
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            {/* Icon */}
                            <div className={`
                                w-9 h-9 rounded-lg bg-gradient-to-br ${indexMode.gradient}
                                flex items-center justify-center flex-shrink-0
                                shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all
                            `}>
                                <i className={`fa-solid ${indexMode.icon} text-white text-sm`}></i>
                            </div>

                            {/* Text */}
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold ${indexMode.textColor}`}>
                                        {indexMode.label}
                                    </span>
                                    {indexMode.advancedModeOnly && (
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                                            ${mode === 'data-engineering' ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}
                                        `}>
                                            {mode === 'data-engineering' ? 'Eng. Dados' : 'Computação'}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-500">
                                    {indexMode.description}
                                </span>
                            </div>

                            {/* Arrow */}
                            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all"></i>
                        </button>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                        <i className="fa-solid fa-lightbulb text-amber-400"></i>
                        Cada modo oferece uma experiência de aprendizado única
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudyModesMenu;
