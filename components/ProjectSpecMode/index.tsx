import React, { useState, useEffect, useRef } from 'react';
import { ProjectChallenge } from '../../types';
import {
    generateProjectChallenges,
    generateConciseSpec,
    saveSpecification
} from '../../services/projectSpecService';
import { saveNoteMetadata } from '../../services/noteMetadataService';
import { useSubjectMode } from '../../hooks/useSubjectMode';

interface ProjectSpecModeProps {
    noteContent: string;
    noteName: string;
    noteId: string;
    tabId?: string;
    directoryHandle?: FileSystemDirectoryHandle | null;
    onClose: () => void;
    pdfData?: ArrayBuffer | null;
    specType?: import('../../types').ProjectSpecType;
}

type ChallengeStatus = 'pending' | 'generating' | 'completed' | 'error';

interface ChallengeWithStatus extends ProjectChallenge {
    status: ChallengeStatus;
}

const ProjectSpecMode: React.FC<ProjectSpecModeProps> = ({
    noteContent,
    noteName,
    noteId,
    directoryHandle,
    onClose,
    pdfData,
    specType = 'aws'
}) => {
    const { mode } = useSubjectMode();

    const [challenges, setChallenges] = useState<ChallengeWithStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchChallenges = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await generateProjectChallenges(noteContent, mode, pdfData || undefined);
                if (result && result.length > 0) {
                    setChallenges(result.map(c => ({ ...c, status: 'pending' as ChallengeStatus })));
                } else {
                    setError("Nenhuma direção de design encontrada. Tente com um conteúdo diferente.");
                }
            } catch (err) {
                setError("Erro ao gerar direções: " + (err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChallenges();
    }, [noteContent, mode, pdfData]);

    const handleGenerate = async (challenge: ChallengeWithStatus) => {
        if (challenge.status === 'generating' || challenge.status === 'completed' || !directoryHandle) return;

        try {
            setChallenges(prev => prev.map(c => c.id === challenge.id ? { ...c, status: 'generating' } : c));

            const specContent = await generateConciseSpec(
                noteContent,
                specType,
                challenge,
                pdfData || undefined
            );

            const tempSession: any = {
                noteId,
                noteName,
                mode,
                language: 'agnostic',
                specType
            };

            const result = await saveSpecification(tempSession, specContent, directoryHandle);

            // Save metadata linking the project to the source note
            if (result.success && result.fileName) {
                // Build the noteId for the saved project file
                // noteId structure: "Root/Topic/SubFolder/definicoes/file.md"
                // Project is saved in "projetos/" sibling to the parent of the note's folder
                const parts = noteId.split('/');
                const pathSegments = [...parts];
                pathSegments.pop(); // Remove source filename
                if (pathSegments.length > 1) {
                    pathSegments.pop(); // Go up one level (past definicoes, pesquisas, etc.)
                }
                pathSegments.push('projetos');
                pathSegments.push(result.fileName);
                const projectNoteId = pathSegments.join('/');

                await saveNoteMetadata(directoryHandle, projectNoteId, {
                    sourceFile: noteId,
                    sourceType: 'md',
                    createdAt: new Date().toISOString()
                });
            }

            setChallenges(prev => prev.map(c =>
                c.id === challenge.id ? { ...c, status: result.success ? 'completed' : 'error' } : c
            ));

        } catch (err) {
            console.error('Error generating spec:', err);
            setChallenges(prev => prev.map(c => c.id === challenge.id ? { ...c, status: 'error' } : c));
        }
    };

    const modeIcon = specType === 'fromScratch' ? 'fa-laptop-code' : 'fa-cloud';
    const modeLabel = specType === 'fromScratch' ? 'Implementação do Zero' : 'Arquitetura AWS';

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                        <i className="fa-solid fa-file-code text-lg"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Especificação de Projeto</h2>
                        <p className="text-xs text-gray-500 font-medium">
                            {noteName} • {challenges.length} direções identificadas
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
                            <i className="fa-solid fa-spinner fa-spin text-4xl mb-4 text-sky-500"></i>
                            <p className="animate-pulse">Analisando conteúdo e gerando direções de design...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center">
                            <i className="fa-solid fa-circle-exclamation text-2xl mb-2"></i>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {challenges.map((challenge) => (
                                <div
                                    key={challenge.id}
                                    onClick={() => challenge.status !== 'completed' && challenge.status !== 'generating' && handleGenerate(challenge)}
                                    className={`
                                        bg-white rounded-xl border p-5 transition-all cursor-pointer relative group overflow-hidden
                                        ${challenge.status === 'completed'
                                            ? 'border-green-200 bg-green-50/30'
                                            : 'border-gray-200 hover:border-sky-300 hover:shadow-lg hover:-translate-y-0.5'
                                        }
                                        ${challenge.status === 'generating' ? 'border-sky-300 ring-2 ring-sky-100' : ''}
                                    `}
                                >
                                    {/* Status Indicator */}
                                    <div className="absolute top-4 right-4">
                                        {challenge.status === 'completed' && (
                                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <i className="fa-solid fa-check"></i> GERADO
                                            </span>
                                        )}
                                        {challenge.status === 'generating' && (
                                            <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <i className="fa-solid fa-spinner fa-spin"></i> GERANDO...
                                            </span>
                                        )}
                                        {challenge.status === 'error' && (
                                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                                <i className="fa-solid fa-triangle-exclamation"></i> ERRO
                                            </span>
                                        )}
                                    </div>

                                    {/* Type Badge */}
                                    <span className={`text-[10px] uppercase tracking-[0.1em] font-black px-2.5 py-1 rounded-lg border inline-block mb-3 ${challenge.type === 'System Design'
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        }`}>
                                        {challenge.type}
                                    </span>

                                    <h3 className="font-bold text-gray-800 pr-20">{challenge.title}</h3>
                                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                        {challenge.description}
                                    </p>

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                                            <i className={`fa-solid ${modeIcon}`}></i>
                                            {modeLabel}
                                        </span>

                                        {challenge.status === 'pending' && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-sky-600 text-xs font-bold flex items-center gap-1">
                                                GERAR ESPECIFICAÇÃO <i className="fa-solid fa-arrow-right"></i>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar for generating */}
                                    {challenge.status === 'generating' && (
                                        <div className="absolute bottom-0 left-0 h-1 bg-sky-500/20 w-full">
                                            <div className="h-full bg-sky-500 animate-progress"></div>
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

export default ProjectSpecMode;
