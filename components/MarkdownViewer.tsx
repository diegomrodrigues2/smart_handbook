import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { slugify } from './Sidebar/TableOfContents';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Mermaid from './Mermaid';
import AudioPlayer from './AudioPlayer';
import StudyModesMenu from './StudyModesMenu';
import ProjectModesMenu from './ProjectModesMenu';
import NoteExcalidraw from './NoteExcalidraw';
import { ExcalidrawSceneData } from './NoteExcalidraw';
import { generateAudioExplanation, createAudioBlobUrl } from '../services/audioService';
import { useSubjectMode } from '../hooks/useSubjectMode';
import { EditableBlock, MultiBlockToolbar, useMultiBlockSelection } from './BlockEditor';
import { SuggestionBar } from './BlockEditor';
import { BlockAction, CodeLanguage, ConceptSuggestion, NoteMetadata } from '../types';
import { generateBlockAction } from '../services/blockEditorService';
import { loadNoteMetadata, loadSourceContent } from '../services/noteMetadataService';

// Helper to determine header level from markdown content
const getHeaderLevel = (content: string): number | null => {
    const match = content.match(/^(#{1,6})\s/);
    return match ? match[1].length : null;
};


interface MarkdownViewerProps {
    content: string;
    fileName: string;
    noteId?: string;
    directoryHandle?: FileSystemDirectoryHandle | null;
    onUpdateContent: (newContent: string) => void;
    onClose: () => void;
    resolveImage?: (src: string) => Promise<string | null>;
    onSelectFile?: (href: string) => void;
    onStartLearning?: () => void;
    onStartLesson?: () => void;
    onStartWorkbook?: () => void;
    onStartChallenge?: () => void;
    onStartInterview?: () => void;
    onStartPairProgramming?: () => void;
    onStartConceptExtraction?: () => void;
    onStartExcalidraw?: (initialData?: ExcalidrawSceneData | null, editingFileName?: string) => void;
    loadExcalidrawData?: (jsonPath: string) => Promise<ExcalidrawSceneData | null>;
    onStartDrawio?: (initialXml?: string | null, editingFileName?: string) => void;
    loadDrawioData?: (xmlPath: string) => Promise<string | null>;
    onRefresh?: () => Promise<void>;
    onStartProjectSpec?: (specType: import('../types').ProjectSpecType) => void;
}

// Helper to check if image is an Excalidraw drawing
const isExcalidrawDrawing = (src: string): boolean => {
    return src.includes('/desenhos/') && (src.includes('desenho_') || src.includes('.excalidraw.json'));
};

const isDrawioDiagram = (src: string): boolean => {
    return src.includes('/desenhos/') && (src.includes('diagrama_') || src.includes('.drawio'));
};

// Helper to get JSON path from PNG path
const getExcalidrawJsonPath = (pngPath: string): string => {
    return pngPath.replace('.png', '.excalidraw.json');
};

const getDrawioXmlPath = (pngPath: string): string => {
    return pngPath.replace('.png', '.drawio');
};

interface MarkdownImageProps {
    src: string;
    alt?: string;
    resolveImage?: (src: string) => Promise<string | null>;
    onEditDrawing?: (jsonPath: string) => void;
    onEditDrawio?: (xmlPath: string) => void;
    onDelete?: (src: string) => void;
    refreshKey?: number;
}

const MarkdownImage: React.FC<MarkdownImageProps> = ({ src, alt, resolveImage, onEditDrawing, onEditDrawio, onDelete, refreshKey }) => {
    const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
    const isDrawing = isExcalidrawDrawing(src);
    const isDiagram = isDrawioDiagram(src);

    useEffect(() => {
        let isMounted = true;
        if (resolveImage) {
            resolveImage(src).then(res => {
                if (isMounted) setResolvedSrc(res);
            });
        } else {
            setResolvedSrc(src);
        }
        return () => { isMounted = false; };
    }, [src, resolveImage, refreshKey]);

    if (!resolvedSrc) return <span className="inline-block w-full h-48 bg-gray-100 animate-pulse rounded-lg text-center leading-[192px] text-gray-400">Loading image...</span>;

    return (
        <span className="relative group my-6 block">
            <img src={resolvedSrc} alt={alt} className="max-w-full h-auto" />

            {/* Container for action buttons */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Excalidraw Edit Button */}
                {isDrawing && onEditDrawing && !isDiagram && (
                    <button
                        onClick={() => onEditDrawing(getExcalidrawJsonPath(src))}
                        className="bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-violet-700"
                        title="Editar desenho"
                    >
                        <i className="fa-solid fa-pencil"></i>
                        Editar
                    </button>
                )}

                {/* Draw.io Edit Button */}
                {isDiagram && onEditDrawio && (
                    <button
                        onClick={() => onEditDrawio(getDrawioXmlPath(src))}
                        className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-orange-700"
                        title="Editar diagrama"
                    >
                        <i className="fa-solid fa-shapes"></i>
                        Editar
                    </button>
                )}

                {/* Delete Button */}
                {onDelete && (
                    <button
                        onClick={() => {
                            if (window.confirm('Tem certeza que deseja remover esta imagem do documento?')) {
                                onDelete(src);
                            }
                        }}
                        className="bg-red-600 text-white p-1.5 rounded-lg shadow-lg hover:bg-red-700 w-8 h-8 flex items-center justify-center transition-transform hover:scale-105"
                        title="Remover imagem"
                    >
                        <i className="fa-solid fa-trash-can"></i>
                    </button>
                )}
            </div>
        </span>
    );
};

// ============================================================================
// Line-tracking utilities for mapping rendered elements back to source lines
// ============================================================================

/**
 * Parse markdown content into logical blocks (contiguous lines that form a single element).
 * Returns an array where each entry is { startLine, endLine, content }.
 * Lines are 0-indexed.
 */
function parseMarkdownBlocks(content: string): { startLine: number; endLine: number; content: string }[] {
    const lines = content.split('\n');
    const blocks: { startLine: number; endLine: number; content: string }[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Empty lines — skip
        if (line.trim() === '') {
            i++;
            continue;
        }

        // Fenced code block (``` or ~~~)
        if (/^(`{3,}|~{3,})/.test(line)) {
            const fence = line.match(/^(`{3,}|~{3,})/)![0];
            const startLine = i;
            i++;
            while (i < lines.length && !lines[i].startsWith(fence)) {
                i++;
            }
            if (i < lines.length) i++; // skip closing fence
            blocks.push({ startLine, endLine: i - 1, content: lines.slice(startLine, i).join('\n') });
            continue;
        }

        // Table (starts with |)
        if (line.trim().startsWith('|')) {
            const startLine = i;
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                i++;
            }
            blocks.push({ startLine, endLine: i - 1, content: lines.slice(startLine, i).join('\n') });
            continue;
        }

        // Blockquote (continuous lines starting with >)
        if (line.trim().startsWith('>')) {
            const startLine = i;
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                i++;
            }
            blocks.push({ startLine, endLine: i - 1, content: lines.slice(startLine, i).join('\n') });
            continue;
        }

        // List items (-, *, +, or numbered) — group consecutive items as one block
        if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
            const startLine = i;
            let insideFence = false;
            while (i < lines.length) {
                const currentLine = lines[i];

                // Handle fenced code blocks inside list items (indented ``` or ~~~)
                if (/^\s*(`{3,}|~{3,})/.test(currentLine)) {
                    insideFence = !insideFence;
                    i++;
                    continue;
                }

                // While inside a fenced code block, consume all lines
                if (insideFence) {
                    i++;
                    continue;
                }

                // Normal list continuation checks
                const isListItem = /^\s*[-*+]\s/.test(currentLine) || /^\s*\d+\.\s/.test(currentLine);
                const isEmpty = currentLine.trim() === '';
                // Indented continuation line (belongs to current list item — text, code, etc.)
                const isContinuation = /^\s{2,}/.test(currentLine) && !isEmpty;

                if (isListItem || isContinuation) {
                    i++;
                    continue;
                }

                if (isEmpty) {
                    // Stop grouping if we hit two consecutive empty lines (paragraph break)
                    if (i + 1 < lines.length && lines[i + 1].trim() === '') break;
                    // Stop if empty line followed by non-list and non-continuation content
                    if (i + 1 < lines.length &&
                        !/^\s*[-*+]\s/.test(lines[i + 1]) &&
                        !/^\s*\d+\.\s/.test(lines[i + 1]) &&
                        !/^\s{2,}/.test(lines[i + 1]) &&
                        !/^\s*(`{3,}|~{3,})/.test(lines[i + 1])) break;
                    i++;
                    continue;
                }

                // Non-list, non-continuation, non-empty line — stop
                break;
            }
            // Trim trailing empty lines from the block
            let endIdx = i - 1;
            while (endIdx > startLine && lines[endIdx].trim() === '') endIdx--;
            blocks.push({ startLine, endLine: endIdx, content: lines.slice(startLine, endIdx + 1).join('\n') });
            continue;
        }

        // Headers, paragraphs, hr, etc. — single line block
        blocks.push({ startLine: i, endLine: i, content: line });
        i++;
    }

    return blocks;
}


// ============================================================================
// Main MarkdownViewer Component
// ============================================================================

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
    content,
    fileName,
    noteId,
    directoryHandle,
    onUpdateContent,
    onClose,
    resolveImage,
    onSelectFile,
    onStartLearning,
    onStartLesson,
    onStartWorkbook,
    onStartChallenge,
    onStartInterview,
    onStartPairProgramming,
    onStartConceptExtraction,
    onStartExcalidraw,
    loadExcalidrawData,
    onStartDrawio,
    loadDrawioData,
    onRefresh,
    onStartProjectSpec
}) => {
    const { mode } = useSubjectMode();
    const [isSourceMode, setIsSourceMode] = useState(false);
    const [localContent, setLocalContent] = useState(content);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioStatus, setAudioStatus] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);

    // Block editor state
    const [generatingBlockIndex, setGeneratingBlockIndex] = useState<number | null>(null);
    const [noteMetadata, setNoteMetadata] = useState<NoteMetadata | null>(null);
    const [loadingSuggestionId, setLoadingSuggestionId] = useState<string | null>(null);
    const [sourceContent, setSourceContent] = useState<string | null>(null);

    // Collapsible sections state
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [showCollapseMenu, setShowCollapseMenu] = useState(false);


    // Multi-block selection
    const blocksContainerRef = useRef<HTMLDivElement>(null);
    const { selectedRange, selectedCount, isBlockSelected, clearSelection, handleMouseDown, isDragging } = useMultiBlockSelection(blocksContainerRef);
    const [isMultiGenerating, setIsMultiGenerating] = useState(false);
    const hasSelection = selectedCount > 0;

    useEffect(() => {
        setLocalContent(content);
    }, [content]);

    // Load note metadata on mount / noteId change
    useEffect(() => {
        const loadMeta = async () => {
            if (directoryHandle && noteId) {
                const meta = await loadNoteMetadata(directoryHandle, noteId);
                setNoteMetadata(meta);

                // If there's a source file, load its content for context
                if (meta?.sourceFile && meta.sourceType === 'md') {
                    const src = await loadSourceContent(directoryHandle, meta.sourceFile);
                    setSourceContent(src);
                }
            }
        };
        loadMeta();
    }, [directoryHandle, noteId]);

    // Parse content into blocks
    const blocks = useMemo(() => parseMarkdownBlocks(localContent), [localContent]);

    // Calculate hidden blocks based on collapsed sections
    const hiddenIndices = useMemo(() => {
        const hidden = new Set<number>();
        const stack: { level: number; collapsed: boolean }[] = [];

        blocks.forEach((block, index) => {
            const level = getHeaderLevel(block.content);
            if (level !== null) {
                // It's a header
                // Pop lower or equal hierarchy levels from stack
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }

                // Check if any parent in the stack is collapsed
                const isParentCollapsed = stack.some(s => s.collapsed);
                if (isParentCollapsed) {
                    hidden.add(index);
                }

                // Push this new header to stack
                // Use matching slug logic
                const text = block.content.replace(/^#{1,6}\s+/, '').trim();
                const slug = slugify(text);
                const isThisCollapsed = collapsedSections.has(slug);

                stack.push({ level, collapsed: isThisCollapsed });
            } else {
                // Content block
                if (stack.some(s => s.collapsed)) {
                    hidden.add(index);
                }
            }
        });
        return hidden;
    }, [blocks, collapsedSections]);

    const toggleSection = useCallback((slug: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            return next;
        });
    }, []);

    const toggleSectionsByLevel = useCallback((levelSelection: number | 'all') => {
        const slugsToCollapse = blocks
            .map(block => {
                const level = getHeaderLevel(block.content);
                if (level !== null) {
                    if (levelSelection === 'all' || level >= levelSelection) {
                        const text = block.content.replace(/^#{1,6}\s+/, '').trim();
                        return slugify(text);
                    }
                }
                return null;
            })
            .filter((slug): slug is string => slug !== null);

        setCollapsedSections(prev => {
            // Expand all if we already have collapsed items and clicking "All"
            if (prev.size > 0 && levelSelection === 'all') {
                return new Set();
            }
            return new Set(slugsToCollapse);
        });
        setShowCollapseMenu(false);
    }, [blocks]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        setLocalContent(newVal);
        onUpdateContent(newVal);
    };

    // Block editing handlers
    const handleBlockEdit = useCallback((blockIndex: number, newContent: string) => {
        const block = blocks[blockIndex];
        if (!block) return;

        const lines = localContent.split('\n');
        // Replace the lines for this block
        const before = lines.slice(0, block.startLine);
        const after = lines.slice(block.endLine + 1);
        const newLines = [...before, ...newContent.split('\n'), ...after];
        const updated = newLines.join('\n');
        setLocalContent(updated);
        onUpdateContent(updated);
    }, [blocks, localContent, onUpdateContent]);

    const handleBlockDelete = useCallback((blockIndex: number) => {
        const block = blocks[blockIndex];
        if (!block) return;

        const lines = localContent.split('\n');
        const before = lines.slice(0, block.startLine);
        const after = lines.slice(block.endLine + 1);
        // Remove trailing empty line if present
        if (before.length > 0 && before[before.length - 1].trim() === '' && after.length > 0 && after[0].trim() === '') {
            after.shift();
        }
        const updated = [...before, ...after].join('\n');
        setLocalContent(updated);
        onUpdateContent(updated);
    }, [blocks, localContent, onUpdateContent]);

    const handleBlockInsert = useCallback((afterBlockIndex: number) => {
        const block = blocks[afterBlockIndex];
        if (!block) return;

        const lines = localContent.split('\n');
        const before = lines.slice(0, block.endLine + 1);
        const after = lines.slice(block.endLine + 1);
        const updated = [...before, '', '', ...after].join('\n');
        setLocalContent(updated);
        onUpdateContent(updated);
    }, [blocks, localContent, onUpdateContent]);

    const handleBlockAction = useCallback(async (action: BlockAction, blockIndex: number, language?: CodeLanguage, userInstruction?: string) => {
        const block = blocks[blockIndex];
        if (!block) return;

        // Special handling for Visuals (Drawings/Diagrams)
        if (action === 'excalidraw' || action === 'drawio') {
            const timestamp = Date.now();
            const tempFileName = action === 'excalidraw' ? `desenho_${timestamp}` : `diagrama_${timestamp}`;
            const label = action === 'excalidraw' ? 'Desenho' : 'Diagrama';

            // Calculate relative path (same logic as in the components)
            const parts = (noteId || '').split(/[\\/]/);
            const relativePrefix = parts.length >= 3 ? './../' : './';
            const relativePath = `${relativePrefix}desenhos/${tempFileName}.png`;

            const imageMarkdown = `\n![${label}](${relativePath})\n`;

            // Insert after current block
            const lines = localContent.split('\n');
            const before = lines.slice(0, block.endLine + 1);
            const after = lines.slice(block.endLine + 1);
            const updated = [...before, imageMarkdown, ...after].join('\n');

            setLocalContent(updated);
            onUpdateContent(updated);

            // Trigger editor
            if (action === 'excalidraw' && onStartExcalidraw) {
                onStartExcalidraw(null, tempFileName);
            } else if (action === 'drawio' && onStartDrawio) {
                onStartDrawio(null, tempFileName);
            }
            return;
        }

        // Handle AI Actions
        setGeneratingBlockIndex(blockIndex);
        try {
            // Find the closest header at or above the current block to maintain hierarchy
            let parentHeaderLevel = 0;
            for (let i = blockIndex; i >= 0; i--) {
                const level = getHeaderLevel(blocks[i].content);
                if (level !== null) {
                    parentHeaderLevel = level;
                    break;
                }
            }

            const generatedContent = await generateBlockAction(
                action,
                localContent,
                block.content,
                mode,
                sourceContent || undefined,
                language,
                userInstruction,
                parentHeaderLevel
            );

            // Insert generated content after the current block
            const lines = localContent.split('\n');
            const before = lines.slice(0, block.endLine + 1);
            const after = lines.slice(block.endLine + 1);
            const updated = [...before, '', generatedContent.trim(), '', ...after].join('\n');
            setLocalContent(updated);
            onUpdateContent(updated);
        } catch (err) {
            console.error('Error generating block action:', err);
            alert(`Erro ao gerar conteúdo: ${(err as Error).message}`);
        } finally {
            setGeneratingBlockIndex(null);
        }
    }, [blocks, localContent, mode, sourceContent, onUpdateContent, noteId, onStartExcalidraw, onStartDrawio]);

    // Multi-block delete handler
    const handleMultiBlockDelete = useCallback(() => {
        if (!selectedRange) return;
        const { from, to } = selectedRange;
        const firstBlock = blocks[from];
        const lastBlock = blocks[to];
        if (!firstBlock || !lastBlock) return;

        const lines = localContent.split('\n');
        const before = lines.slice(0, firstBlock.startLine);
        const after = lines.slice(lastBlock.endLine + 1);
        // Remove adjacent empty lines
        if (before.length > 0 && before[before.length - 1].trim() === '' && after.length > 0 && after[0].trim() === '') {
            after.shift();
        }
        const updated = [...before, ...after].join('\n');
        setLocalContent(updated);
        onUpdateContent(updated);
        clearSelection();
    }, [selectedRange, blocks, localContent, onUpdateContent, clearSelection]);

    // Multi-block AI action handler
    const handleMultiBlockAction = useCallback(async (action: BlockAction, language?: CodeLanguage, userInstruction?: string) => {
        if (!selectedRange) return;
        const { from, to } = selectedRange;
        const firstBlock = blocks[from];
        const lastBlock = blocks[to];
        if (!firstBlock || !lastBlock) return;

        // Special handling for Visuals (Drawings/Diagrams)
        if (action === 'excalidraw' || action === 'drawio') {
            const timestamp = Date.now();
            const tempFileName = action === 'excalidraw' ? `desenho_${timestamp}` : `diagrama_${timestamp}`;
            const label = action === 'excalidraw' ? 'Desenho' : 'Diagrama';

            const parts = (noteId || '').split(/[\\/]/);
            const relativePrefix = parts.length >= 3 ? './../' : './';
            const relativePath = `${relativePrefix}desenhos/${tempFileName}.png`;
            const imageMarkdown = `\n![${label}](${relativePath})\n`;

            // Replace all selected blocks with the image link
            const lines = localContent.split('\n');
            const before = lines.slice(0, firstBlock.startLine);
            const after = lines.slice(lastBlock.endLine + 1);
            const updated = [...before, imageMarkdown, ...after].join('\n');

            setLocalContent(updated);
            onUpdateContent(updated);
            clearSelection();

            if (action === 'excalidraw' && onStartExcalidraw) {
                onStartExcalidraw(null, tempFileName);
            } else if (action === 'drawio' && onStartDrawio) {
                onStartDrawio(null, tempFileName);
            }
            return;
        }

        // Collect combined content of selected blocks
        const selectedBlocks = blocks.slice(from, to + 1);
        const combinedContent = selectedBlocks.map(b => b.content).join('\n\n');

        setIsMultiGenerating(true);
        try {
            // Find the closest header at or above the start of selection to maintain hierarchy
            let parentHeaderLevel = 0;
            for (let i = from; i >= 0; i--) {
                const level = getHeaderLevel(blocks[i].content);
                if (level !== null) {
                    parentHeaderLevel = level;
                    break;
                }
            }

            const generatedContent = await generateBlockAction(
                action,
                localContent,
                combinedContent,
                mode,
                sourceContent || undefined,
                language,
                userInstruction,
                parentHeaderLevel
            );

            // Replace all selected blocks with the generated content
            const lines = localContent.split('\n');
            const before = lines.slice(0, firstBlock.startLine);
            const after = lines.slice(lastBlock.endLine + 1);
            const updated = [...before, '', generatedContent.trim(), '', ...after].join('\n');
            setLocalContent(updated);
            onUpdateContent(updated);
            clearSelection();
        } catch (err) {
            console.error('Error generating multi-block action:', err);
            alert(`Erro ao gerar conteúdo: ${(err as Error).message}`);
        } finally {
            setIsMultiGenerating(false);
        }
    }, [selectedRange, blocks, localContent, mode, sourceContent, onUpdateContent, clearSelection, noteId, onStartExcalidraw, onStartDrawio]);

    // Suggestion handler
    const handleAcceptSuggestion = useCallback(async (suggestion: ConceptSuggestion) => {
        setLoadingSuggestionId(suggestion.id);
        try {
            // Map suggestion sectionType to a BlockAction
            const actionMap: Record<string, BlockAction> = {
                'tradeoffs': 'tradeoffs-table',
                'code-example': 'code-example',
                'diagram': 'mermaid-graph',
                'implementation-guide': 'implementation-guide',
                'deep-dive': 'more-detailed',
                'use-cases': 'enrich',
                'comparison': 'tradeoffs-table',
            };
            const action = actionMap[suggestion.sectionType] || 'enrich';

            const generatedContent = await generateBlockAction(
                action,
                localContent,
                `Section suggestion: ${suggestion.title} — ${suggestion.description}`,
                mode,
                sourceContent || undefined
            );

            // Append to the end of the content
            const updated = localContent.trimEnd() + '\n\n' + generatedContent.trim() + '\n';
            setLocalContent(updated);
            onUpdateContent(updated);

            // Remove the used suggestion from metadata
            if (noteMetadata && noteMetadata.suggestions) {
                const updatedSuggestions = noteMetadata.suggestions.filter(s => s.id !== suggestion.id);
                setNoteMetadata({ ...noteMetadata, suggestions: updatedSuggestions });
            }
        } catch (err) {
            console.error('Error generating suggestion:', err);
            alert(`Erro ao gerar seção sugerida: ${(err as Error).message}`);
        } finally {
            setLoadingSuggestionId(null);
        }
    }, [localContent, mode, sourceContent, noteMetadata, onUpdateContent]);

    const handleGenerateAudio = async () => {
        setIsGeneratingAudio(true);
        setAudioStatus('Preparando...');

        const result = await generateAudioExplanation(content, setAudioStatus);

        if (result) {
            const url = createAudioBlobUrl(result.audioBase64, result.mimeType);
            setAudioUrl(url);
            setShowPlayer(true);
        }

        setIsGeneratingAudio(false);
        setAudioStatus('');
    };

    const handleClosePlayer = () => {
        setShowPlayer(false);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
    };

    const handleOpenExcalidraw = () => {
        if (onStartExcalidraw) {
            onStartExcalidraw(null, undefined);
        }
    };

    const handleOpenDrawio = () => {
        if (onStartDrawio) {
            onStartDrawio(null, undefined);
        }
    };

    const handleEditDrawing = async (jsonPath: string) => {
        if (loadExcalidrawData && onStartExcalidraw) {
            const data = await loadExcalidrawData(jsonPath);
            if (data) {
                const parts = jsonPath.split('/');
                const fileName = parts[parts.length - 1].replace('.excalidraw.json', '');
                onStartExcalidraw(data, fileName);
            } else {
                alert('Não foi possível carregar os dados do desenho para edição.');
            }
        }
    };

    const handleEditDrawio = async (xmlPath: string) => {
        if (loadDrawioData && onStartDrawio) {
            const data = await loadDrawioData(xmlPath);
            if (data !== null) {
                const parts = xmlPath.split('/');
                const fileName = parts[parts.length - 1].replace('.drawio', '');
                onStartDrawio(data, fileName);
            } else {
                alert('Não foi possível carregar os dados do diagrama para edição.');
            }
        }
    };

    const handleDeleteImage = (imageSrc: string) => {
        const escapedSrc = imageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const imageRegex = new RegExp(`!\\[.*?\\]\\(${escapedSrc}\\)`, 'g');
        const newContent = localContent.replace(imageRegex, '');
        setLocalContent(newContent);
        onUpdateContent(newContent);
    };

    // Render a single block's markdown content
    const renderBlockContent = (blockContent: string) => {
        // Extract raw text for slug generation to match logic in hiddenIndices
        // This ensures the toggle button matches the state key
        const rawHeaderText = blockContent.replace(/^#{1,6}\s+/, '').trim();
        const headerSlug = slugify(rawHeaderText);
        const isCollapsed = collapsedSections.has(headerSlug);

        const HeaderIcon = () => (
            <span className="mr-2 text-gray-400 hover:text-indigo-500 transition-colors inline-block w-5 text-center">
                <i className={`fa-solid fa-chevron-${isCollapsed ? 'right' : 'down'} text-sm`}></i>
            </span>
        );

        return (
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    h1: ({ node, children, ...props }) => {
                        const text = typeof children === 'string' ? children : String(children);
                        return (
                            <div className="group flex items-start -ml-7">
                                <div
                                    className="mt-2 pt-1 cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); toggleSection(headerSlug); }}
                                    title={isCollapsed ? "Expandir seção" : "Recolher seção"}
                                >
                                    <HeaderIcon />
                                </div>
                                <h1 id={`heading-${slugify(text)}`} className="text-4xl font-serif text-gray-900 mb-6 pb-4 border-b-2 border-indigo-200 flex-1" {...props}>
                                    {children}
                                </h1>
                            </div>
                        );
                    },
                    h2: ({ node, children, ...props }) => {
                        const text = typeof children === 'string' ? children : String(children);
                        return (
                            <div className="group flex items-center -ml-7">
                                <div
                                    className="cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); toggleSection(headerSlug); }}
                                    title={isCollapsed ? "Expandir seção" : "Recolher seção"}
                                >
                                    <HeaderIcon />
                                </div>
                                <h2 id={`heading-${slugify(text)}`} className="text-2xl font-serif text-indigo-800 mt-10 mb-4 font-semibold flex-1" {...props}>
                                    {children}
                                </h2>
                            </div>
                        );
                    },
                    h3: ({ node, children, ...props }) => {
                        const text = typeof children === 'string' ? children : String(children);
                        return (
                            <div className="group flex items-center -ml-7">
                                <div
                                    className="cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); toggleSection(headerSlug); }}
                                    title={isCollapsed ? "Expandir seção" : "Recolher seção"}
                                >
                                    <HeaderIcon />
                                </div>
                                <h3 id={`heading-${slugify(text)}`} className="text-xl font-serif text-gray-800 mt-6 mb-3 font-medium flex-1" {...props}>
                                    {children}
                                </h3>
                            </div>
                        );
                    },
                    h4: ({ node, children, ...props }) => {
                        const text = typeof children === 'string' ? children : String(children);
                        return (
                            <div className="group flex items-center -ml-7">
                                <div
                                    className="cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); toggleSection(headerSlug); }}
                                    title={isCollapsed ? "Expandir seção" : "Recolher seção"}
                                >
                                    <HeaderIcon />
                                </div>
                                <h4 id={`heading-${slugify(text)}`} className="text-lg font-serif text-gray-700 mt-4 mb-2 font-medium flex-1" {...props}>
                                    {children}
                                </h4>
                            </div>
                        );
                    },
                    p: ({ node, ...props }) => <p className="mb-4 text-lg text-gray-700 leading-relaxed font-serif" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 font-serif" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 font-serif" {...props} />,
                    li: ({ node, ...props }) => <li className="text-lg leading-relaxed" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-300 bg-indigo-50 pl-4 py-2 my-4 italic text-gray-600 font-serif" {...props} />,
                    hr: () => <hr className="my-8 border-t-2 border-gray-200" />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-indigo-900" {...props} />,
                    em: ({ node, ...props }) => <em className="italic text-gray-600" {...props} />,
                    img: ({ node, src, alt, ...props }) => (
                        <MarkdownImage
                            src={src || ''}
                            alt={alt}
                            resolveImage={resolveImage}
                            onEditDrawing={directoryHandle && noteId ? handleEditDrawing : undefined}
                            onEditDrawio={directoryHandle && noteId ? handleEditDrawio : undefined}
                            onDelete={handleDeleteImage}
                        />
                    ),
                    table: ({ node, ...props }) => (
                        <div className="my-8 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                            <table className="w-full text-left border-collapse bg-white font-serif" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                    th: ({ node, ...props }) => <th className="px-6 py-4 text-sm font-bold text-gray-700 uppercase tracking-wider" {...props} />,
                    td: ({ node, ...props }) => <td className="px-6 py-4 text-base text-gray-600 border-b border-gray-100 font-serif" {...props} />,
                    tr: ({ node, ...props }) => <tr className="hover:bg-blue-50/30 transition-colors" {...props} />,
                    a: ({ node, href, children, ...props }) => {
                        const handleClick = (e: React.MouseEvent) => {
                            if (href && !href.startsWith('http') && !href.startsWith('#') && onSelectFile) {
                                e.preventDefault();
                                onSelectFile(href);
                            }
                        };
                        return (
                            <a
                                href={href}
                                onClick={handleClick}
                                className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4 transition-colors font-medium decoration-2"
                                {...props}
                            >
                                {children}
                            </a>
                        );
                    },
                    code: ({ node, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const codeString = String(children).replace(/\n$/, '');
                        const isBlock = className || codeString.includes('\n');

                        if (isBlock && language === 'mermaid') {
                            return <Mermaid chart={codeString} />;
                        }

                        return !isBlock ? (
                            <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-sm border border-gray-200" {...props}>
                                {children}
                            </code>
                        ) : (
                            <div className="my-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                {language && (
                                    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 text-xs font-mono text-gray-500 flex items-center gap-2">
                                        <i className="fa-solid fa-code text-gray-400"></i>
                                        {language}
                                    </div>
                                )}
                                <SyntaxHighlighter
                                    style={github}
                                    language={language || 'text'}
                                    PreTag="div"
                                    customStyle={{
                                        margin: 0,
                                        padding: '0.75rem 1rem',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.5',
                                        background: '#f6f8fa',
                                        borderRadius: 0,
                                    }}
                                    codeTagProps={{
                                        style: {
                                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                                        }
                                    }}
                                    {...props}
                                >
                                    {codeString}
                                </SyntaxHighlighter>
                            </div>
                        );
                    }
                }}
            >
                {blockContent}
            </ReactMarkdown>
        );
    };

    const hasSuggestions = noteMetadata?.suggestions && noteMetadata.suggestions.length > 0;

    return (
        <div className="h-full flex flex-col bg-white shadow-sm border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-end bg-gray-50 border-b border-gray-200 px-4 h-10 select-none gap-2">
                {/* Source file indicator */}
                {noteMetadata?.sourceFile && (
                    <div className="mr-auto flex items-center gap-1.5 text-xs text-gray-400">
                        <i className="fa-solid fa-link text-[10px]"></i>
                        <span className="font-mono truncate max-w-[200px]" title={noteMetadata.sourceFile}>
                            {noteMetadata.sourceFile.split('/').pop()}
                        </span>
                    </div>
                )}

                {/* Collapse/Expand All Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowCollapseMenu(!showCollapseMenu)}
                        className="text-xs border border-indigo-200 rounded-lg px-3 py-1.5 transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium flex items-center gap-1.5"
                        title="Opções de visualização"
                    >
                        <i className="fa-solid fa-layer-group text-[10px]"></i>
                        <span>{collapsedSections.size > 0 ? 'Expandir' : 'Recolher'}</span>
                        <i className={`fa-solid fa-chevron-${showCollapseMenu ? 'up' : 'down'} text-[8px] ml-0.5 opacity-60`}></i>
                    </button>

                    {showCollapseMenu && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowCollapseMenu(false)}></div>
                            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-40 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => toggleSectionsByLevel('all')}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 text-gray-700 flex items-center justify-between group"
                                >
                                    <span>{collapsedSections.size > 0 ? 'Expandir Tudo' : 'Recolher Tudo'}</span>
                                    <span className="text-[10px] text-gray-400 group-hover:text-indigo-400 font-mono">H1+</span>
                                </button>
                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                <button
                                    onClick={() => toggleSectionsByLevel(2)}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 text-gray-700 flex items-center justify-between group"
                                >
                                    <span>Recolher Nível 2+</span>
                                    <span className="text-[10px] text-gray-400 group-hover:text-indigo-400 font-mono">H2, H3, H4</span>
                                </button>
                                <button
                                    onClick={() => toggleSectionsByLevel(3)}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 text-gray-700 flex items-center justify-between group"
                                >
                                    <span>Recolher Nível 3+</span>
                                    <span className="text-[10px] text-gray-400 group-hover:text-indigo-400 font-mono">H3, H4</span>
                                </button>
                                <button
                                    onClick={() => toggleSectionsByLevel(4)}
                                    className="w-full text-left px-4 py-2 text-xs hover:bg-indigo-50 text-gray-700 flex items-center justify-between group"
                                >
                                    <span>Recolher Nível 4+</span>
                                    <span className="text-[10px] text-gray-400 group-hover:text-indigo-400 font-mono">H4</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Audio Explanation Button */}
                <button
                    onClick={handleGenerateAudio}
                    disabled={isGeneratingAudio}
                    className="text-xs border border-amber-200 rounded-lg px-3 py-1.5 transition-all bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 hover:to-orange-100 font-medium flex items-center gap-1.5 disabled:opacity-50"
                    title="Gerar Explicação em Áudio"
                >
                    {isGeneratingAudio ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>{audioStatus || 'Gerando...'}</span>
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-headphones"></i>
                            <span>Ouvir</span>
                        </>
                    )}
                </button>

                {/* Study Modes Dropdown */}
                <StudyModesMenu
                    onStartLearning={onStartLearning}
                    onStartLesson={onStartLesson}
                    onStartWorkbook={onStartWorkbook}
                    onStartChallenge={onStartChallenge}
                    onStartInterview={onStartInterview}
                    onStartPairProgramming={onStartPairProgramming}
                    onStartConceptExtraction={onStartConceptExtraction}
                    mode={mode}
                />

                {/* Project Modes Dropdown */}
                <ProjectModesMenu
                    onStartProjectSpec={onStartProjectSpec}
                    mode={mode}
                />

                {/* Source/Preview Toggle */}
                <button
                    onClick={() => setIsSourceMode(!isSourceMode)}
                    className={`text-xs font-mono border border-gray-200 rounded-lg px-3 py-1.5 transition-all ${isSourceMode
                        ? 'bg-blue-100 text-blue-700 border-blue-200 font-semibold'
                        : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    {isSourceMode ? <><i className="fa-solid fa-eye mr-1"></i>Preview</> : <><i className="fa-solid fa-code mr-1"></i>Source</>}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-white relative">
                {isSourceMode ? (
                    <textarea
                        className="w-full h-full p-8 font-mono text-sm resize-none outline-none text-gray-800 leading-relaxed"
                        value={localContent}
                        onChange={handleContentChange}
                        spellCheck={false}
                    />
                ) : (
                    <div className="h-full overflow-y-auto flex flex-col">
                        <div className="flex-1 p-8 md:p-12">
                            <div
                                ref={blocksContainerRef}
                                className={`max-w-3xl mx-auto markdown-body pl-14 pb-32 ${isDragging ? 'select-none' : ''}`}
                                onMouseDown={handleMouseDown}
                            >
                                {/* Multi-block selection toolbar */}
                                {hasSelection && (
                                    <MultiBlockToolbar
                                        selectedCount={selectedCount}
                                        onDelete={handleMultiBlockDelete}
                                        onAction={handleMultiBlockAction}
                                        onClear={clearSelection}
                                        isGenerating={isMultiGenerating}
                                    />
                                )}

                                {blocks.map((block, index) => {
                                    if (hiddenIndices.has(index)) return null;

                                    return (
                                        <React.Fragment key={`${block.startLine}-${block.content.substring(0, 20)}`}>
                                            <div data-block-index={index}>
                                                <EditableBlock
                                                    lineIndex={index}
                                                    lineContent={block.content}
                                                    onEdit={handleBlockEdit}
                                                    onDelete={handleBlockDelete}
                                                    onInsert={handleBlockInsert}
                                                    onAction={handleBlockAction}
                                                    isGenerating={generatingBlockIndex === index}
                                                    isSelected={isBlockSelected(index)}
                                                    isInSelectionMode={hasSelection}
                                                >
                                                    {renderBlockContent(block.content)}
                                                </EditableBlock>
                                            </div>

                                            {/* Generating placeholder — appears BELOW the block where + was clicked */}
                                            {generatingBlockIndex === index && (
                                                <div className="my-4 p-6 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex items-center justify-center gap-3 animate-pulse">
                                                    <i className="fa-solid fa-wand-magic-sparkles text-indigo-400 text-lg"></i>
                                                    <span className="text-indigo-500 font-medium text-sm">Generating content...</span>
                                                    <i className="fa-solid fa-spinner fa-spin text-indigo-400"></i>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Suggestion Bar — shown at the bottom when metadata has suggestions */}
                        {hasSuggestions && (
                            <SuggestionBar
                                suggestions={noteMetadata!.suggestions!}
                                onAcceptSuggestion={handleAcceptSuggestion}
                                isLoading={loadingSuggestionId !== null}
                                loadingSuggestionId={loadingSuggestionId}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Audio Player */}
            {showPlayer && audioUrl && (
                <AudioPlayer
                    audioUrl={audioUrl}
                    title={fileName}
                    onClose={handleClosePlayer}
                />
            )}
        </div>
    );
};

export default MarkdownViewer;