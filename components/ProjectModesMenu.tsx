import React, { useState, useRef, useEffect } from 'react';
import { SubjectMode, ProjectSpecType } from '../types';

interface ProjectMode {
    id: string;
    label: string;
    description: string;
    icon: string;
    gradient: string;
    borderColor: string;
    textColor: string;
    onClick: () => void;
}

interface ProjectModesMenuProps {
    onStartProjectSpec?: (specType: ProjectSpecType) => void;
    mode: SubjectMode;
}

const ProjectModesMenu: React.FC<ProjectModesMenuProps> = ({
    onStartProjectSpec,
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

    // Don't render for mathematics mode
    if (mode === 'mathematics') {
        return null;
    }

    const modes: ProjectMode[] = [
        ...(onStartProjectSpec ? [
            {
                id: 'project-from-scratch',
                label: 'Criar do Zero',
                description: 'Implemente do zero para aprender os conceitos',
                icon: 'fa-laptop-code',
                gradient: 'from-violet-500 to-purple-600',
                borderColor: 'border-violet-200',
                textColor: 'text-violet-600',
                onClick: () => { onStartProjectSpec('fromScratch'); setIsOpen(false); }
            },
            {
                id: 'project-aws',
                label: 'Criar para AWS',
                description: 'Arquitetura cloud-native production-ready',
                icon: 'fa-cloud',
                gradient: 'from-amber-500 to-orange-600',
                borderColor: 'border-amber-200',
                textColor: 'text-amber-600',
                onClick: () => { onStartProjectSpec('aws'); setIsOpen(false); }
            }
        ] : [])
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
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent shadow-lg shadow-sky-200'
                        : 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border-sky-200 hover:from-sky-100 hover:to-blue-100'
                    }
                `}
            >
                <i className="fa-solid fa-diagram-project"></i>
                <span>Modo Projeto</span>
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
                <div className="px-4 py-3 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
                    <h3 className="text-sm font-bold text-sky-700 flex items-center gap-2">
                        <i className="fa-solid fa-cubes text-sky-500"></i>
                        Criação de Projetos
                    </h3>
                    <p className="text-[10px] text-sky-600 mt-0.5">
                        Crie especificações técnicas guiadas
                    </p>
                </div>

                {/* Modes List */}
                <div className="p-2 space-y-1">
                    {modes.map((projectMode, index) => (
                        <button
                            key={projectMode.id}
                            onClick={projectMode.onClick}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                transition-all duration-150 group
                                hover:bg-sky-50 active:scale-[0.98]
                            `}
                            style={{
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            {/* Icon */}
                            <div className={`
                                w-9 h-9 rounded-lg bg-gradient-to-br ${projectMode.gradient}
                                flex items-center justify-center flex-shrink-0
                                shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all
                            `}>
                                <i className={`fa-solid ${projectMode.icon} text-white text-sm`}></i>
                            </div>

                            {/* Text */}
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold ${projectMode.textColor}`}>
                                        {projectMode.label}
                                    </span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                                        ${mode === 'data-engineering' ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}
                                    `}>
                                        {mode === 'data-engineering' ? 'Eng. Dados' : 'Computação'}
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-500">
                                    {projectMode.description}
                                </span>
                            </div>

                            {/* Arrow */}
                            <i className="fa-solid fa-chevron-right text-[10px] text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all"></i>
                        </button>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 bg-sky-50 border-t border-sky-100">
                    <p className="text-[10px] text-sky-500 flex items-center gap-1.5">
                        <i className="fa-solid fa-wand-magic-sparkles text-sky-400"></i>
                        Especificações geradas servem de prompt para agentes de código
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProjectModesMenu;
