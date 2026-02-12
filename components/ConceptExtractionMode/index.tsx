
import React, { useState, useEffect, useRef } from 'react';
import { SubjectMode, Concept, ConceptSuggestion } from '../../types';
import { extractConcepts, generateConceptDefinition, saveDefinitionFile } from '../../services/extractionService';
import { saveNoteMetadata } from '../../services/noteMetadataService';

interface ConceptExtractionModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    tabId?: string;
    mode: SubjectMode;
    directoryHandle: FileSystemDirectoryHandle | null;
    onClose: () => void;
    pdfData?: ArrayBuffer;
}

// Extended concept type with per-concept suggestions
interface ConceptWithSuggestions extends Concept {
    suggestions: ConceptSuggestion[];
}

const ConceptExtractionMode: React.FC<ConceptExtractionModeProps> = ({
    noteContent,
    noteName,
    noteId,
    mode,
    directoryHandle,
    onClose,
    pdfData
}) => {
    const [concepts, setConcepts] = useState<ConceptWithSuggestions[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        // Prevent double fetch in React Strict Mode
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchConcepts = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await extractConcepts(noteContent, mode, pdfData);
                if (result) {
                    setConcepts(result.concepts as ConceptWithSuggestions[]);
                } else {
                    setError("Falha ao extrair conceitos. Tente novamente.");
                }
            } catch (err) {
                setError("Erro na extração: " + (err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConcepts();
    }, [noteContent, mode, pdfData]);

    const handleGenerateDefinition = async (concept: ConceptWithSuggestions) => {
        if (concept.status === 'generating' || concept.status === 'completed' || !directoryHandle) return;

        try {
            setConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, status: 'generating' } : c));

            // 1. Generate content
            const content = await generateConceptDefinition(concept, noteContent, mode, pdfData);

            // 2. Save definition file
            const saved = await saveDefinitionFile(directoryHandle, noteId, concept.fileName, content);

            // 3. Save metadata with per-concept suggestions and source reference
            if (saved) {
                const parts = noteId.split('/');
                parts.pop(); // Remove source filename
                const pathSegments = parts.slice(0);
                if (pathSegments.length > 1) {
                    pathSegments.pop(); // Go up one level (past pesquisas, etc.)
                }
                pathSegments.push('definicoes');
                pathSegments.push(concept.fileName);
                const definitionNoteId = pathSegments.join('/');

                await saveNoteMetadata(directoryHandle, definitionNoteId, {
                    sourceFile: noteId,
                    sourceType: pdfData ? 'pdf' : 'md',
                    suggestions: concept.suggestions,
                    createdAt: new Date().toISOString()
                });
            }

            setConcepts(prev => prev.map(c =>
                c.id === concept.id ? { ...c, status: saved ? 'completed' : 'error' } : c
            ));

        } catch (err) {
            console.error(err);
            setConcepts(prev => prev.map(c => c.id === concept.id ? { ...c, status: 'error' } : c));
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-lightbulb text-lg"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Extração de Conceitos</h2>
                        <p className="text-xs text-gray-500 font-medium">
                            {noteName} • {concepts.length} conceitos identificados
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <i className="fa-solid fa-spinner fa-spin text-4xl mb-4 text-indigo-500"></i>
                            <p className="animate-pulse">Analisando conteúdo e identificando conceitos...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center">
                            <i className="fa-solid fa-circle-exclamation text-2xl mb-2"></i>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {concepts.map((concept) => (
                                <div
                                    key={concept.id}
                                    onClick={() => concept.status !== 'completed' && concept.status !== 'generating' && handleGenerateDefinition(concept)}
                                    className={`
                                        bg-white rounded-xl border p-5 transition-all cursor-pointer relative group overflow-hidden
                                        ${concept.status === 'completed'
                                            ? 'border-green-200 bg-green-50/30'
                                            : 'border-gray-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5'
                                        }
                                        ${concept.status === 'generating' ? 'border-indigo-300 ring-2 ring-indigo-100' : ''}
                                    `}
                                >
                                    {/* Status Indicator */}
                                    <div className="absolute top-4 right-4">
                                        {concept.status === 'completed' && (
                                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <i className="fa-solid fa-check"></i> GERADO
                                            </span>
                                        )}
                                        {concept.status === 'generating' && (
                                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <i className="fa-solid fa-spinner fa-spin"></i> GERANDO...
                                            </span>
                                        )}
                                        {concept.status === 'error' && (
                                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <i className="fa-solid fa-triangle-exclamation"></i> ERRO
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-gray-800 pr-20">{concept.name}</h3>
                                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                        {concept.shortDefinition}
                                    </p>

                                    {/* Per-concept suggestions preview */}
                                    {concept.suggestions && concept.suggestions.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {concept.suggestions.slice(0, 3).map(s => (
                                                <span key={s.id} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                                                    {s.title}
                                                </span>
                                            ))}
                                            {concept.suggestions.length > 3 && (
                                                <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full">
                                                    +{concept.suggestions.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-400 font-mono">
                                            <i className="fa-regular fa-file-code mr-1"></i>
                                            definicoes/{concept.fileName}
                                        </span>

                                        {concept.status === 'pending' && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 text-xs font-bold flex items-center gap-1">
                                                GERAR DEFINIÇÃO <i className="fa-solid fa-arrow-right"></i>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar for generating */}
                                    {concept.status === 'generating' && (
                                        <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/20 w-full">
                                            <div className="h-full bg-indigo-500 animate-progress"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    0% { width: 0% }
                    100% { width: 100% }
                }
                .animate-progress {
                    animation: progress 15s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default ConceptExtractionMode;
