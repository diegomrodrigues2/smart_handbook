import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockAction, CodeLanguage } from '../../types';

interface MultiBlockToolbarProps {
    selectedCount: number;
    onDelete: () => void;
    onAction: (action: BlockAction, language?: CodeLanguage, userInstruction?: string) => void;
    onClear: () => void;
    isGenerating?: boolean;
}

const CODE_LANGUAGES: { value: CodeLanguage; label: string; icon: string }[] = [
    { value: 'python', label: 'Python', icon: 'fa-brands fa-python' },
    { value: 'java', label: 'Java', icon: 'fa-brands fa-java' },
    { value: 'typescript', label: 'TypeScript', icon: 'fa-brands fa-js' },
    { value: 'go', label: 'Go', icon: 'fa-solid fa-code' },
    { value: 'terraform', label: 'Terraform', icon: 'fa-solid fa-cloud' },
    { value: 'sql', label: 'SQL', icon: 'fa-solid fa-database' },
];

const SECONDARY_LANGUAGES: { value: CodeLanguage; label: string; icon: string }[] = [
    { value: 'pseudocode', label: 'Pseudocódigo', icon: 'fa-solid fa-file-code' },
    { value: 'rust', label: 'Rust', icon: 'fa-solid fa-gear' },
    { value: 'scala', label: 'Scala', icon: 'fa-solid fa-code' },
    { value: 'pyspark', label: 'PySpark', icon: 'fa-solid fa-fire' },
    { value: 'cloudformation', label: 'CloudFormation', icon: 'fa-brands fa-aws' },
    { value: 'kubernetes', label: 'Kubernetes', icon: 'fa-solid fa-dharmachakra' },
];

const MENU_SECTIONS = [
    {
        title: 'Diagrams',
        icon: 'fa-solid fa-diagram-project',
        items: [
            { action: 'mermaid-sequence' as BlockAction, label: 'Sequence', icon: 'fa-solid fa-arrows-left-right' },
            { action: 'mermaid-flowchart' as BlockAction, label: 'Flowchart', icon: 'fa-solid fa-sitemap' },
            { action: 'mermaid-graph' as BlockAction, label: 'Graph', icon: 'fa-solid fa-circle-nodes' },
            { action: 'mermaid-class' as BlockAction, label: 'Class', icon: 'fa-solid fa-object-group' },
            { action: 'mermaid-er' as BlockAction, label: 'ER', icon: 'fa-solid fa-table-cells' },
            { action: 'mermaid-state' as BlockAction, label: 'State', icon: 'fa-solid fa-shuffle' },
            { action: 'mermaid-gantt' as BlockAction, label: 'Gantt', icon: 'fa-solid fa-bars-staggered' },
        ]
    },
    {
        title: 'Visuals',
        icon: 'fa-solid fa-palette',
        items: [
            { action: 'excalidraw' as BlockAction, label: 'Desenho', icon: 'fa-solid fa-pencil' },
            { action: 'drawio' as BlockAction, label: 'Diagrama', icon: 'fa-solid fa-shapes' },
        ]
    },
    {
        title: 'Engineering',
        icon: 'fa-solid fa-microchip',
        items: [
            { action: 'requirements' as BlockAction, label: 'Requirements', icon: 'fa-solid fa-clipboard-check' },
            { action: 'api-contract' as BlockAction, label: 'API Contract', icon: 'fa-solid fa-file-contract' },
            { action: 'system-spec' as BlockAction, label: 'System Spec', icon: 'fa-solid fa-file-invoice' },
            { action: 'implementation-design' as BlockAction, label: 'Design', icon: 'fa-solid fa-compass-drafting' },
            { action: 'implementation-tasks' as BlockAction, label: 'Tasks', icon: 'fa-solid fa-list-check' },
        ]
    }
];

const PRIMARY_ACTIONS: { action: BlockAction; label: string; icon: string }[] = [
    { action: 'summarize', label: 'Resumir', icon: 'fa-solid fa-compress' },
    { action: 'enrich', label: 'Enriquecer', icon: 'fa-solid fa-gem' },
    { action: 'more-detailed', label: 'Detalhar', icon: 'fa-solid fa-magnifying-glass-plus' },
    { action: 'implementation-guide', label: 'Guia', icon: 'fa-solid fa-list-check' },
    { action: 'tradeoffs-table', label: 'Trade-offs', icon: 'fa-solid fa-scale-balanced' },
];

const MultiBlockToolbar: React.FC<MultiBlockToolbarProps> = ({
    selectedCount,
    onDelete,
    onAction,
    onClear,
    isGenerating = false
}) => {
    const [pendingAction, setPendingAction] = useState<{ action: BlockAction; language?: CodeLanguage } | null>(null);
    const [instructionText, setInstructionText] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const instructionRef = useRef<HTMLTextAreaElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (activeDropdown && toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

    // Focus instruction input
    useEffect(() => {
        if (pendingAction && instructionRef.current) {
            instructionRef.current.focus();
        }
    }, [pendingAction]);

    const handleSelectAction = useCallback((action: BlockAction, language?: CodeLanguage) => {
        const isVisual = action === 'excalidraw' || action === 'drawio';
        const isDiagram = action.startsWith('mermaid-');

        if (isVisual || isDiagram) {
            onAction(action, language);
            setActiveDropdown(null);
            return;
        }

        setPendingAction({ action, language });
        setInstructionText('');
        setActiveDropdown(null);
    }, [onAction]);

    const handleConfirm = useCallback(() => {
        if (!pendingAction) return;
        const instruction = instructionText.trim() || undefined;
        onAction(pendingAction.action, pendingAction.language, instruction);
        setPendingAction(null);
        setInstructionText('');
    }, [pendingAction, instructionText, onAction]);

    const handleCancelAction = useCallback(() => {
        setPendingAction(null);
        setInstructionText('');
    }, []);

    const handleInstructionKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            handleCancelAction();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleConfirm();
        }
    }, [handleCancelAction, handleConfirm]);

    if (isGenerating) {
        return (
            <div
                ref={toolbarRef}
                data-multi-toolbar
                className="fixed top-8 left-1/2 -translate-x-1/2 z-[3000] px-6 py-3 bg-indigo-600 rounded-full shadow-2xl flex items-center gap-3 animate-pulse border border-white/20 whitespace-nowrap"
            >
                <i className="fa-solid fa-wand-magic-sparkles text-white"></i>
                <span className="text-white font-bold text-sm">Gerando para {selectedCount} blocos...</span>
                <i className="fa-solid fa-spinner fa-spin text-white/70"></i>
            </div>
        );
    }

    return (
        <div
            ref={toolbarRef}
            data-multi-toolbar
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[3000] max-w-[95vw] w-fit bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-indigo-100 flex flex-col items-center"
        >
            {/* Horizontal Bar */}
            {!pendingAction && (
                <div className="flex items-center gap-1 p-1.5 px-3">
                    {/* Left: Count & Delete */}
                    <div className="flex items-center gap-2 pr-3 mr-1 border-r border-gray-100 flex-shrink-0">
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-xl">
                            <i className="fa-solid fa-layer-group text-indigo-500 text-xs"></i>
                            <span className="text-xs font-bold text-indigo-700">{selectedCount}</span>
                        </div>
                        <button
                            onClick={onDelete}
                            className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Excluir seleção"
                        >
                            <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                    </div>

                    {/* Actions Area - REMOVED overflow-x-auto to prevent dropdown clipping */}
                    <div className="flex items-center gap-1 px-1">
                        {/* Primary Actions */}
                        {PRIMARY_ACTIONS.map(item => (
                            <button
                                key={item.action}
                                onClick={() => handleSelectAction(item.action)}
                                className="px-3 py-2 text-xs font-bold text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                            >
                                <i className={`${item.icon} text-gray-400`}></i>
                                {item.label}
                            </button>
                        ))}

                        <div className="w-px h-6 bg-gray-100 mx-1 flex-shrink-0"></div>

                        {/* Dropdowns */}
                        {MENU_SECTIONS.map(section => (
                            <div key={section.title} className="relative flex-shrink-0 group">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === section.title ? null : section.title)}
                                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${activeDropdown === section.title ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    <i className={`${section.icon} ${activeDropdown === section.title ? 'text-white/70' : 'text-gray-400'}`}></i>
                                    {section.title}
                                    <i className={`fa-solid fa-chevron-${activeDropdown === section.title ? 'up' : 'down'} text-[10px]`}></i>
                                </button>

                                {activeDropdown === section.title && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 min-w-[180px] z-[4000]">
                                        {section.items.map(item => (
                                            <button
                                                key={item.action}
                                                onClick={() => handleSelectAction(item.action)}
                                                className="w-full text-left px-3 py-2.5 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors group"
                                            >
                                                <i className={`${item.icon} w-4 text-center text-gray-400 group-hover:text-indigo-400`}></i>
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Code Dropdown */}
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'Code' ? null : 'Code')}
                                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${activeDropdown === 'Code' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <i className={`fa-solid fa-code ${activeDropdown === 'Code' ? 'text-white/70' : 'text-gray-400'}`}></i>
                                Code
                                <i className={`fa-solid fa-chevron-${activeDropdown === 'Code' ? 'up' : 'down'} text-[10px]`}></i>
                            </button>

                            {activeDropdown === 'Code' && (
                                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 min-w-[280px] z-[4000] grid grid-cols-2 gap-1">
                                    {[...CODE_LANGUAGES, ...SECONDARY_LANGUAGES].map(lang => (
                                        <button
                                            key={lang.value}
                                            onClick={() => handleSelectAction('code-example', lang.value)}
                                            className="text-left px-3 py-2.5 text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors group"
                                        >
                                            <i className={`${lang.icon} w-4 text-center text-gray-400 group-hover:text-indigo-400`}></i>
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-6 bg-gray-100 mx-1 flex-shrink-0"></div>

                    {/* Clear */}
                    <button
                        onClick={onClear}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
                        title="Limpar seleção (Esc)"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>
            )}

            {/* Instruction prompt — fixed width and centered */}
            {pendingAction && (
                <div className="p-3 pr-4 flex items-center gap-4 w-[650px] max-w-[90vw]">
                    <div className="flex items-center gap-3 pl-2 border-l-4 border-indigo-500 py-1 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                            <i className="fa-solid fa-wand-magic-sparkles text-sm"></i>
                        </div>
                        <div className="flex-shrink-0">
                            <span className="text-xs font-bold text-gray-800 block">
                                Refinar Geração
                            </span>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block trancate max-w-[120px]">
                                {ALL_ACTIONS.find(a => a.action === pendingAction.action)?.label}
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <input
                            ref={instructionRef as any}
                            type="text"
                            value={instructionText}
                            onChange={(e) => setInstructionText(e.target.value)}
                            onKeyDown={handleInstructionKeyDown}
                            placeholder="Instrução adicional... (Enter para gerar)"
                            className="w-full px-4 py-2.5 text-sm border-2 border-indigo-100 rounded-xl bg-gray-50 focus:bg-white outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                        <button
                            onClick={handleCancelAction}
                            className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="px-6 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            <i className="fa-solid fa-bolt"></i>
                            GERAR
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ALL_ACTIONS = [
    ...PRIMARY_ACTIONS,
    ...MENU_SECTIONS.flatMap(s => s.items),
    { action: 'code-example' as BlockAction, label: 'Code Example', icon: 'fa-solid fa-terminal' }
];

export default MultiBlockToolbar;
