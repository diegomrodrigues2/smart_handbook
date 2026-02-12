import React, { useEffect, useRef } from 'react';
import { BlockAction, CodeLanguage } from '../../types';

interface BlockActionMenuProps {
    onSelectAction: (action: BlockAction, language?: CodeLanguage) => void;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLButtonElement | null>;
}

const CODE_LANGUAGES: { value: CodeLanguage; label: string; icon: string }[] = [
    { value: 'python', label: 'Python', icon: 'fa-brands fa-python' },
    { value: 'java', label: 'Java', icon: 'fa-brands fa-java' },
    { value: 'pseudocode', label: 'Pseudocódigo', icon: 'fa-solid fa-file-code' },
    { value: 'terraform', label: 'Terraform', icon: 'fa-solid fa-cloud' },
    { value: 'go', label: 'Go', icon: 'fa-solid fa-code' },
    { value: 'typescript', label: 'TypeScript', icon: 'fa-brands fa-js' },
    { value: 'rust', label: 'Rust', icon: 'fa-solid fa-gear' },
    { value: 'scala', label: 'Scala', icon: 'fa-solid fa-code' },
    { value: 'sql', label: 'SQL', icon: 'fa-solid fa-database' },
    { value: 'pyspark', label: 'PySpark', icon: 'fa-solid fa-fire' },
    { value: 'cloudformation', label: 'CloudFormation', icon: 'fa-brands fa-aws' },
    { value: 'kubernetes', label: 'Kubernetes', icon: 'fa-solid fa-dharmachakra' },
];

const MENU_SECTIONS = [
    {
        title: 'Mermaid Diagrams',
        icon: 'fa-solid fa-diagram-project',
        items: [
            { action: 'mermaid-sequence' as BlockAction, label: 'Sequence Diagram', icon: 'fa-solid fa-arrows-left-right' },
            { action: 'mermaid-graph' as BlockAction, label: 'Graph Diagram', icon: 'fa-solid fa-circle-nodes' },
            { action: 'mermaid-flowchart' as BlockAction, label: 'Flowchart', icon: 'fa-solid fa-sitemap' },
            { action: 'mermaid-class' as BlockAction, label: 'Class Diagram', icon: 'fa-solid fa-object-group' },
            { action: 'mermaid-er' as BlockAction, label: 'ER Diagram', icon: 'fa-solid fa-table-cells' },
            { action: 'mermaid-state' as BlockAction, label: 'State Diagram', icon: 'fa-solid fa-shuffle' },
            { action: 'mermaid-gantt' as BlockAction, label: 'Gantt Chart', icon: 'fa-solid fa-bars-staggered' },
        ]
    },
    {
        title: 'Tables',
        icon: 'fa-solid fa-table',
        items: [
            { action: 'tradeoffs-table' as BlockAction, label: 'Trade-offs Table', icon: 'fa-solid fa-scale-balanced' },
        ]
    },
    {
        title: 'Visuals',
        icon: 'fa-solid fa-palette',
        items: [
            { action: 'excalidraw' as BlockAction, label: 'Incluir Desenho', icon: 'fa-solid fa-pencil' },
            { action: 'drawio' as BlockAction, label: 'Incluir Diagrama', icon: 'fa-solid fa-shapes' },
        ]
    },
    {
        title: 'Content',
        icon: 'fa-solid fa-wand-magic-sparkles',
        items: [
            { action: 'implementation-guide' as BlockAction, label: 'Implementation Guide', icon: 'fa-solid fa-list-check' },
            { action: 'enrich' as BlockAction, label: 'Enrich', icon: 'fa-solid fa-gem' },
            { action: 'more-detailed' as BlockAction, label: 'More Detailed', icon: 'fa-solid fa-magnifying-glass-plus' },
            { action: 'summarize' as BlockAction, label: 'Summarize', icon: 'fa-solid fa-compress' },
        ]
    },
    {
        title: 'Engineering',
        icon: 'fa-solid fa-microchip',
        items: [
            { action: 'requirements' as BlockAction, label: 'System Requirements', icon: 'fa-solid fa-clipboard-check' },
            { action: 'api-contract' as BlockAction, label: 'API Contract / Interface', icon: 'fa-solid fa-file-contract' },
            { action: 'system-spec' as BlockAction, label: 'System Specification', icon: 'fa-solid fa-file-invoice' },
            { action: 'implementation-design' as BlockAction, label: 'Implementation Design', icon: 'fa-solid fa-compass-drafting' },
            { action: 'implementation-tasks' as BlockAction, label: 'Implementation Tasks', icon: 'fa-solid fa-list-check' },
        ]
    }
];

const BlockActionMenu: React.FC<BlockActionMenuProps> = ({
    onSelectAction,
    onEdit,
    onDelete,
    onClose,
    anchorRef
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showCodeSubmenu, setShowCodeSubmenu] = React.useState(false);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose, anchorRef]);

    return (
        <div
            ref={menuRef}
            className="absolute left-1/2 -translate-x-1/2 top-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 w-64 max-h-[70vh] overflow-y-auto"
            style={{ backdropFilter: 'blur(12px)' }}
        >
            {/* Edit & Delete */}
            <div className="px-2 pb-2 border-b border-gray-100">
                <button
                    onClick={onEdit}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2.5 transition-colors"
                >
                    <i className="fa-solid fa-pencil w-4 text-center text-gray-400"></i>
                    Edit Block
                </button>
                <button
                    onClick={onDelete}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2.5 transition-colors"
                >
                    <i className="fa-solid fa-trash-can w-4 text-center"></i>
                    Delete Block
                </button>
            </div>

            {/* AI Actions header */}
            <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> AI Actions
                </span>
            </div>

            {/* Mermaid / Tables / Content sections */}
            {MENU_SECTIONS.map((section) => (
                <div key={section.title} className="px-2 py-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <i className={`${section.icon} text-[9px]`}></i>
                        {section.title}
                    </div>
                    {section.items.map((item) => (
                        <button
                            key={item.action}
                            onClick={() => onSelectAction(item.action)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-2.5 transition-colors"
                        >
                            <i className={`${item.icon} w-4 text-center text-gray-400`}></i>
                            {item.label}
                        </button>
                    ))}
                </div>
            ))}

            {/* Code Example — with language sub-menu */}
            <div className="px-2 py-1 border-t border-gray-100">
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-code text-[9px]"></i>
                    Code
                </div>
                <button
                    onClick={() => setShowCodeSubmenu(!showCodeSubmenu)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center justify-between transition-colors"
                >
                    <span className="flex items-center gap-2.5">
                        <i className="fa-solid fa-terminal w-4 text-center text-gray-400"></i>
                        Code Example
                    </span>
                    <i className={`fa-solid fa-chevron-${showCodeSubmenu ? 'down' : 'right'} text-xs text-gray-400`}></i>
                </button>

                {showCodeSubmenu && (
                    <div className="ml-4 mt-1 bg-gray-50 rounded-lg p-1">
                        {CODE_LANGUAGES.map((lang) => (
                            <button
                                key={lang.value}
                                onClick={() => onSelectAction('code-example', lang.value)}
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-white hover:text-indigo-700 rounded-md flex items-center gap-2 transition-colors"
                            >
                                <i className={`${lang.icon} w-4 text-center text-gray-400`}></i>
                                {lang.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BlockActionMenu;
