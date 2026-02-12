
"use client";
import React, { useState, useRef, useEffect } from 'react';
import { DrawIoEmbed, DrawIoEmbedRef } from 'react-drawio';

interface NoteDrawioProps {
    noteId: string;
    noteContent: string;
    directoryHandle: FileSystemDirectoryHandle | null;
    onSave: (imagePath: string, newContent: string) => void;
    onCancel: () => void;
    initialXml?: string | null;
    existingFileName?: string;
}

// Helper to get parent folder path from noteId
const getParentFolderPath = (noteId: string): string[] => {
    const parts = noteId.split(/[\\/]/);
    if (parts.length >= 3) {
        return parts.slice(1, -2);
    }
    return parts.slice(1, -1);
};

// Helper to get note file path
const getNoteFolderPath = (noteId: string): string[] => {
    const parts = noteId.split(/[\\/]/);
    return parts.slice(1, -1);
};

// Helper to get note filename
const getNoteFileName = (noteId: string): string => {
    const parts = noteId.split(/[\\/]/);
    return parts[parts.length - 1];
};

// Helper to get relative path prefix
const getRelativePathPrefix = (noteId: string): string => {
    const parts = noteId.split(/[\\/]/);
    if (parts.length >= 3) {
        return './../';
    }
    return './';
};

// Helper to insert image markdown
const insertImageInContent = (content: string, imagePath: string, existingFileName?: string): string => {
    const lines = content.split('\n');
    if (existingFileName) {
        const escapedFileName = existingFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingPattern = new RegExp(`!\\[.*?\\]\\(.*?${escapedFileName}\\.png\\)`, 'g');
        const newImageMarkdown = `![Diagrama](${imagePath})`;

        if (existingPattern.test(content)) {
            return content.replace(existingPattern, newImageMarkdown);
        }
    }

    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#')) {
            insertIndex = i + 1;
            break;
        }
    }

    const imageMarkdown = `\n![Diagrama](${imagePath})\n`;
    lines.splice(insertIndex, 0, imageMarkdown);
    return lines.join('\n');
};

const NoteDrawio: React.FC<NoteDrawioProps> = ({
    noteId,
    noteContent,
    directoryHandle,
    onSave,
    onCancel,
    initialXml,
    existingFileName
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const drawIoRef = useRef<DrawIoEmbedRef>(null);

    console.log('NoteDrawio - initialXml:', initialXml ? `${initialXml.substring(0, 100)}...` : 'null/undefined');
    console.log('NoteDrawio - existingFileName:', existingFileName);

    const handleDrawioSave = (data: { xml: string }) => {
        // When user clicks save, we request an export to get the PNG
        // The saving logic will be handled in onExport
        // Use 'xmlpng' format which returns actual PNG binary (with embedded XML)
        if (drawIoRef.current) {
            setIsSaving(true);
            drawIoRef.current.exportDiagram({
                format: 'xmlpng',
                spin: true
            });
        }
    };

    const handleDrawioExport = async (data: { event: 'export', format: string, data: string, xml: string }) => {
        console.log('Draw.io export received:', { format: data.format, hasData: !!data.data, dataLength: data.data?.length, dataStart: data.data?.substring(0, 50) });

        if (!directoryHandle) {
            alert("Directory handle not available.");
            setIsSaving(false);
            return;
        }

        try {
            const timestamp = Date.now();
            const baseName = existingFileName
                ? existingFileName.replace('.png', '').replace('.drawio', '')
                : `diagrama_${timestamp}`;

            const pngFileName = `${baseName}.png`;
            const xmlFileName = `${baseName}.drawio`;

            // Prepare PNG Blob
            let pngBlob: Blob;
            if (data.data) {
                // For xmlpng format, data should be a data URI like: data:image/png;base64,...
                if (data.data.startsWith('data:image/png')) {
                    const res = await fetch(data.data);
                    pngBlob = await res.blob();
                    console.log('PNG blob created, size:', pngBlob.size);
                } else if (data.data.startsWith('<svg') || data.data.startsWith('data:image/svg')) {
                    // SVG was returned instead of PNG - this is an issue
                    console.error('SVG data received instead of PNG. Format requested:', data.format);
                    setIsSaving(false);
                    alert("Erro: O servidor retornou SVG em vez de PNG. Tente novamente.");
                    return;
                } else {
                    // Unknown format - try to use it anyway
                    console.warn('Unknown data format, attempting to use as-is:', data.data.substring(0, 100));
                    const res = await fetch(data.data);
                    pngBlob = await res.blob();
                }
            } else {
                console.warn("No data received from Draw.io export", data);
                setIsSaving(false);
                alert("Erro: Não foi possível gerar a imagem do diagrama. Dados vazios.");
                return;
            }

            // Navigate to parent folder for drawings
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
            await pngWritable.write(pngBlob);
            await pngWritable.close();

            // Save XML
            const xmlFileHandle = await desenhosHandle.getFileHandle(xmlFileName, { create: true });
            const xmlWritable = await xmlFileHandle.createWritable();
            await xmlWritable.write(data.xml);
            await xmlWritable.close();

            // Calculate relative path
            const relativePrefix = getRelativePathPrefix(noteId);
            const relativePath = `${relativePrefix}desenhos/${pngFileName}`;

            // Update content
            const newContent = insertImageInContent(noteContent, relativePath, existingFileName);

            // Save note
            const noteFolderPath = getNoteFolderPath(noteId);
            let noteFolderHandle = directoryHandle;
            for (const folderName of noteFolderPath) {
                if (!folderName) continue;
                noteFolderHandle = await noteFolderHandle.getDirectoryHandle(folderName, { create: false });
            }

            const noteFileName = getNoteFileName(noteId);
            const noteFileHandle = await noteFolderHandle.getFileHandle(noteFileName, { create: false });
            const noteWritable = await noteFileHandle.createWritable();
            await noteWritable.write(newContent);
            await noteWritable.close();

            onSave(relativePath, newContent);

        } catch (error) {
            console.error("Error saving diagram:", error);
            alert("Erro ao salvar o diagrama. Verifique o console.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg">
                        <i className="fa-solid fa-shapes"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">
                            {existingFileName ? 'Editar Diagrama' : 'Novo Diagrama'}
                        </h2>
                        <p className="text-xs text-gray-500">Draw.io</p>
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
                    {/* Note: Save is typically handled within the embedded editor's UI 
                        But we can also try to force it if the library supports ref.save()
                        For now, rely on the editor's save button which we hook into.
                    */}
                </div>
            </div>

            <div className="flex-1 relative bg-gray-100 items-center justify-center flex">
                {isSaving && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-600 rounded-full animate-spin"></div>
                            <p className="text-gray-700 font-medium">Salvando diagrama...</p>
                        </div>
                    </div>
                )}

                {/* Show loader if we are editing an existing file but XML hasn't loaded yet */}
                {existingFileName && !initialXml ? (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                        <i className="fa-solid fa-spinner fa-spin text-3xl mb-4 text-orange-500"></i>
                        <p>Carregando diagrama...</p>
                    </div>
                ) : (
                    <DrawIoEmbed
                        ref={drawIoRef}
                        // We provide xml prop but also manually load on 'onLoad' to be safe
                        xml={initialXml || ''}
                        exportFormat="xmlpng"
                        onSave={handleDrawioSave}
                        onExport={handleDrawioExport}
                        onLoad={() => {
                            // Manually load the XML when the editor is ready
                            if (initialXml && drawIoRef.current) {
                                console.log('Editor loaded, manually loading XML...');
                                try {
                                    drawIoRef.current.load({ xml: initialXml });
                                } catch (e) {
                                    console.error('Error triggering manual load:', e);
                                }
                            }
                        }}
                        urlParameters={{
                            ui: 'atlas',
                            spin: true,
                            libraries: 1,
                            saveAndExit: '1',
                            noSaveBtn: '0',
                            noExitBtn: '1'
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default NoteDrawio;
