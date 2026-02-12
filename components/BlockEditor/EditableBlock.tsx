import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockAction, CodeLanguage } from '../../types';
import BlockActionMenu from './BlockActionMenu';

interface EditableBlockProps {
    lineIndex: number;
    lineContent: string;
    children: React.ReactNode;
    onEdit: (index: number, newContent: string) => void;
    onDelete: (index: number) => void;
    onInsert: (afterIndex: number) => void;
    onAction: (action: BlockAction, lineIndex: number, language?: CodeLanguage, userInstruction?: string) => void;
    isGenerating?: boolean;
    isSelected?: boolean;
    isInSelectionMode?: boolean;
}

const EditableBlock: React.FC<EditableBlockProps> = ({
    lineIndex,
    lineContent,
    children,
    onEdit,
    onDelete,
    onInsert,
    onAction,
    isGenerating = false,
    isSelected = false,
    isInSelectionMode = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(lineContent);
    const [showMenu, setShowMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const originalValueRef = useRef(lineContent);

    // Pending AI action state — shown after selecting an action from the menu
    const [pendingAction, setPendingAction] = useState<{ action: BlockAction; language?: CodeLanguage } | null>(null);
    const [instructionText, setInstructionText] = useState('');
    const instructionRef = useRef<HTMLTextAreaElement>(null);

    // Sync edit value when lineContent changes externally (e.g., AI-generated content)
    useEffect(() => {
        if (!isEditing) {
            setEditValue(lineContent);
            originalValueRef.current = lineContent;
        }
    }, [lineContent, isEditing]);

    // Auto-resize textarea to fit content
    const autoResize = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, []);

    // Focus and resize when entering edit mode
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.focus();
            // Place cursor at the end
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            autoResize();
        }
    }, [isEditing, autoResize]);

    // Focus instruction input when it appears
    useEffect(() => {
        if (pendingAction && instructionRef.current) {
            instructionRef.current.focus();
        }
    }, [pendingAction]);

    const handleStartEdit = useCallback(() => {
        if (isGenerating || isInSelectionMode) return;
        setEditValue(lineContent);
        originalValueRef.current = lineContent;
        setIsEditing(true);
    }, [isGenerating, isInSelectionMode, lineContent]);

    const handleSave = useCallback(() => {
        setIsEditing(false);
        const trimmed = editValue.trimEnd();
        if (trimmed !== lineContent) {
            onEdit(lineIndex, trimmed);
        }
    }, [editValue, lineIndex, lineContent, onEdit]);

    const handleCancel = useCallback(() => {
        setEditValue(originalValueRef.current);
        setIsEditing(false);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
        // Tab inserts 2 spaces for code-like editing
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.target as HTMLTextAreaElement;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = editValue.substring(0, start) + '  ' + editValue.substring(end);
            setEditValue(newValue);
            // Restore cursor position after React re-renders
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 2;
            });
        }
    }, [handleCancel, editValue]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditValue(e.target.value);
        // Auto-resize on next frame after React updates the value
        requestAnimationFrame(autoResize);
    }, [autoResize]);

    // AI Action instruction handlers
    const handleConfirmAction = useCallback(() => {
        if (!pendingAction) return;
        const instruction = instructionText.trim() || undefined;
        onAction(pendingAction.action, lineIndex, pendingAction.language, instruction);
        setPendingAction(null);
        setInstructionText('');
    }, [pendingAction, instructionText, onAction, lineIndex]);

    const handleCancelAction = useCallback(() => {
        setPendingAction(null);
        setInstructionText('');
    }, []);

    const handleInstructionKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelAction();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleConfirmAction();
        }
    }, [handleCancelAction, handleConfirmAction]);

    if (isEditing) {
        return (
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={handleChange}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="block-edit-textarea"
                    spellCheck={false}
                />
                <div className="mt-0.5 text-[10px] text-gray-300 font-mono text-right select-none">
                    Esc to cancel · click outside to save
                </div>
            </div>
        );
    }

    return (
        <div className={`relative group ${isGenerating ? 'pointer-events-none' : ''} ${isSelected ? 'bg-indigo-50/70 ring-2 ring-indigo-200 rounded-lg' : ''}`}>
            {/* Delete button — top-right, visible on hover */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(lineIndex); }}
                className="absolute -right-8 top-0 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Delete block"
            >
                <i className="fa-solid fa-trash-can text-xs"></i>
            </button>

            {/* Block content — click to edit */}
            <div
                onClick={handleStartEdit}
                className="cursor-text rounded-lg transition-colors duration-150 hover:bg-gray-50/60"
            >
                {children}
            </div>

            {/* Instruction prompt — shown after selecting an AI action */}
            {pendingAction && (
                <div className="my-3 border border-indigo-200 rounded-xl bg-indigo-50/40 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-wand-magic-sparkles text-indigo-400 text-sm"></i>
                        <span className="text-sm font-medium text-indigo-700">
                            Instrução adicional <span className="text-gray-400 font-normal">(opcional)</span>
                        </span>
                    </div>
                    <textarea
                        ref={instructionRef}
                        value={instructionText}
                        onChange={(e) => setInstructionText(e.target.value)}
                        onKeyDown={handleInstructionKeyDown}
                        placeholder="Descreva o que deseja... (ou deixe em branco para gerar automaticamente)"
                        className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-all"
                        rows={2}
                        style={{ fontFamily: 'inherit' }}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400 font-mono">
                            Ctrl+Enter para gerar · Esc para cancelar
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancelAction}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <i className="fa-solid fa-bolt text-[10px]"></i>
                                Gerar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* "+" divider — thin hover target that expands on its own hover */}
            <div className="relative h-1 hover:h-8 transition-all duration-200 z-20 flex items-center [&:hover>.divider-line]:opacity-100 [&:hover>.divider-btn]:opacity-100">
                {/* Full-width horizontal line */}
                <div className="divider-line absolute inset-x-0 top-1/2 h-px bg-indigo-200 opacity-0 transition-opacity"></div>

                {/* Centered + button on top of the line */}
                <div className="divider-btn relative mx-auto opacity-0 transition-opacity">
                    <button
                        ref={plusButtonRef}
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="w-7 h-7 flex items-center justify-center bg-white border-2 border-indigo-300 text-indigo-500 rounded-full shadow-sm hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 hover:scale-110 transition-all"
                        title="Add content below"
                    >
                        <i className="fa-solid fa-plus text-xs"></i>
                    </button>
                </div>
            </div>

            {/* Action Menu — positioned below the + button */}
            {showMenu && (
                <BlockActionMenu
                    onSelectAction={(action, language) => {
                        setShowMenu(false);
                        // Only show instruction prompt for AI actions
                        if (action === 'excalidraw' || action === 'drawio') {
                            onAction(action, lineIndex, language);
                        } else {
                            setPendingAction({ action, language });
                            setInstructionText('');
                        }
                    }}
                    onEdit={() => {
                        setShowMenu(false);
                        handleStartEdit();
                    }}
                    onDelete={() => {
                        setShowMenu(false);
                        onDelete(lineIndex);
                    }}
                    onClose={() => setShowMenu(false)}
                    anchorRef={plusButtonRef}
                />
            )}
        </div>
    );
};

export default EditableBlock;
