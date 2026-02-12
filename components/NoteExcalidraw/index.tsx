"use client";
import React, { useState, useRef, useEffect } from 'react';
import { exportToBlob } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';

// Dynamically import Excalidraw to avoid SSR issues
const ExcalidrawLazy = React.lazy(async () => {
    const module = await import('@excalidraw/excalidraw');
    return { default: module.Excalidraw };
});

export interface ExcalidrawSceneData {
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
    files: BinaryFiles;
}

interface NoteExcalidrawProps {
    noteId: string;
    noteContent: string; // Current content of the note
    directoryHandle: FileSystemDirectoryHandle | null;
    onSave: (imagePath: string, newContent: string) => void;
    onCancel: () => void;
    initialData?: ExcalidrawSceneData | null;
    existingFileName?: string; // For editing existing drawings
}

// Helper to get parent folder path from noteId (goes up to parent like other features)
const getParentFolderPath = (noteId: string): string[] => {
    const parts = noteId.split(/[\\/]/);
    // Go up 2 levels (past 'definicoes', 'pesquisas', etc.) like roteiro/challenges
    if (parts.length >= 3) {
        return parts.slice(1, -2);
    }
    return parts.slice(1, -1);
};

// Helper to get note file path
const getNoteFolderPath = (noteId: string): string[] => {
    const parts = noteId.split(/[\\/]/);
    // Return path to the folder containing the note (excluding root and filename)
    return parts.slice(1, -1);
};

// Helper to get note filename
const getNoteFileName = (noteId: string): string => {
    const parts = noteId.split(/[\\/]/);
    return parts[parts.length - 1];
};

// Helper to get the folder depth difference for relative path
const getRelativePathPrefix = (noteId: string): string => {
    const parts = noteId.split(/[\\/]/);
    // Note is at depth X, desenhos is at parent level
    if (parts.length >= 3) {
        return './../';
    }
    return './';
};

// Helper to insert image markdown after first heading
const insertImageInContent = (content: string, imagePath: string, existingFileName?: string): string => {
    const lines = content.split('\n');

    // If editing existing, replace the old reference
    if (existingFileName) {
        // Build regex that misses the path but matches the filename
        // Matches: ![alt](any_path/filename.png)
        const escapedFileName = existingFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingPattern = new RegExp(`!\\[.*?\\]\\(.*?${escapedFileName}\\.png\\)`, 'g');
        const newImageMarkdown = `![Desenho](${imagePath})`;

        if (existingPattern.test(content)) {
            return content.replace(existingPattern, newImageMarkdown);
        }
    }

    // Find first heading and insert after it
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#')) {
            insertIndex = i + 1;
            break;
        }
    }

    const imageMarkdown = `\n![Desenho](${imagePath})\n`;
    lines.splice(insertIndex, 0, imageMarkdown);
    return lines.join('\n');
};

const NoteExcalidraw: React.FC<NoteExcalidrawProps> = ({
    noteId,
    noteContent,
    directoryHandle,
    onSave,
    onCancel,
    initialData,
    existingFileName
}) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!excalidrawAPI || !directoryHandle) {
            alert("Não foi possível salvar. Directory handle não disponível.");
            return;
        }

        const elements = excalidrawAPI.getSceneElements();
        if (!elements || elements.length === 0) {
            alert("Desenhe algo antes de salvar!");
            return;
        }

        setIsSaving(true);

        try {
            // Generate filename based on timestamp or reuse existing
            const timestamp = Date.now();
            const baseName = existingFileName
                ? existingFileName.replace('.png', '').replace('.excalidraw.json', '')
                : `desenho_${timestamp}`;

            const pngFileName = `${baseName}.png`;
            const jsonFileName = `${baseName}.excalidraw.json`;

            // Export as PNG
            const blob = await exportToBlob({
                elements,
                appState: {
                    ...excalidrawAPI.getAppState(),
                    exportWithDarkMode: false,
                    exportBackground: true,
                },
                files: excalidrawAPI.getFiles(),
                mimeType: "image/png",
                quality: 0.95,
            });

            // Get scene data for JSON
            const sceneData: ExcalidrawSceneData = {
                elements: excalidrawAPI.getSceneElements(),
                appState: {
                    viewBackgroundColor: excalidrawAPI.getAppState().viewBackgroundColor,
                    currentItemFontFamily: excalidrawAPI.getAppState().currentItemFontFamily,
                },
                files: excalidrawAPI.getFiles(),
            };

            // Navigate to parent folder for desenhos
            const parentPath = getParentFolderPath(noteId);
            let desenhosParentHandle = directoryHandle;
            for (const folderName of parentPath) {
                if (!folderName) continue;
                desenhosParentHandle = await desenhosParentHandle.getDirectoryHandle(folderName, { create: false });
            }

            // Create or get 'desenhos' folder
            const desenhosHandle = await desenhosParentHandle.getDirectoryHandle('desenhos', { create: true });

            // Save PNG
            const pngFileHandle = await desenhosHandle.getFileHandle(pngFileName, { create: true });
            const pngWritable = await pngFileHandle.createWritable();
            await pngWritable.write(blob);
            await pngWritable.close();

            // Save JSON
            const jsonFileHandle = await desenhosHandle.getFileHandle(jsonFileName, { create: true });
            const jsonWritable = await jsonFileHandle.createWritable();
            await jsonWritable.write(JSON.stringify(sceneData, null, 2));
            await jsonWritable.close();

            // Calculate correct relative path from note to desenhos folder
            const relativePrefix = getRelativePathPrefix(noteId);
            const relativePath = `${relativePrefix}desenhos/${pngFileName}`;

            // Update note content with image
            const newContent = insertImageInContent(noteContent, relativePath, existingFileName);

            // Navigate to note folder and save the note file
            const noteFolderPath = getNoteFolderPath(noteId);
            let noteFolderHandle = directoryHandle;
            for (const folderName of noteFolderPath) {
                if (!folderName) continue;
                noteFolderHandle = await noteFolderHandle.getDirectoryHandle(folderName, { create: false });
            }

            // Save the updated note
            const noteFileName = getNoteFileName(noteId);
            const noteFileHandle = await noteFolderHandle.getFileHandle(noteFileName, { create: false });
            const noteWritable = await noteFileHandle.createWritable();
            await noteWritable.write(newContent);
            await noteWritable.close();

            // Notify parent with new content
            onSave(relativePath, newContent);

        } catch (error) {
            console.error("Error saving drawing:", error);
            alert("Erro ao salvar o desenho. Verifique o console para mais detalhes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <i className="fa-solid fa-pencil"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">
                            {existingFileName ? 'Editar Desenho' : 'Novo Desenho'}
                        </h2>
                        <p className="text-xs text-gray-500">Desenhe e salve para adicionar à sua nota</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                        <i className="fa-solid fa-xmark"></i>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-200 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-floppy-disk"></i>
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Excalidraw Canvas */}
            <div className="flex-1 relative">
                <React.Suspense fallback={
                    <div className="h-full w-full flex items-center justify-center bg-gray-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                            <p className="text-gray-600 font-medium">Carregando Excalidraw...</p>
                        </div>
                    </div>
                }>
                    <ExcalidrawLazy
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        initialData={initialData || undefined}
                        theme="light"
                        langCode="pt-BR"
                        UIOptions={{
                            canvasActions: {
                                loadScene: false,
                                export: false,
                                saveToActiveFile: false,
                            },
                        }}
                    />
                </React.Suspense>

                {isSaving && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                            <p className="text-gray-700 font-medium">Salvando desenho...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoteExcalidraw;
