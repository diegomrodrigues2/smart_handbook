"use client";
import React, { useState, forwardRef, useImperativeHandle } from 'react';
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

export interface ExcalidrawWrapperProps {
    onExportToChat: (imageUrl: string, base64: string, mimeType: string) => void;
    theme?: "light" | "dark";
    initialData?: ExcalidrawSceneData | null;
}

export interface ExcalidrawWrapperRef {
    exportAsImage: () => Promise<void>;
    getSceneData: () => ExcalidrawSceneData | null;
}

const ExcalidrawWrapper = forwardRef<ExcalidrawWrapperRef, ExcalidrawWrapperProps>(
    ({ onExportToChat, theme = "light", initialData }, ref) => {
        const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
        const [isExporting, setIsExporting] = useState(false);

        // Expose export function and getSceneData via ref
        useImperativeHandle(ref, () => ({
            exportAsImage: async () => {
                if (!excalidrawAPI) return;

                const elements = excalidrawAPI.getSceneElements();
                if (!elements || elements.length === 0) {
                    alert("Desenhe algo antes de enviar!");
                    return;
                }

                setIsExporting(true);
                try {
                    const blob = await exportToBlob({
                        elements,
                        appState: {
                            ...excalidrawAPI.getAppState(),
                            exportWithDarkMode: theme === "dark",
                            exportBackground: true,
                        },
                        files: excalidrawAPI.getFiles(),
                        mimeType: "image/png",
                        quality: 0.95,
                    });

                    // Convert blob to base64 and URL
                    const imageUrl = URL.createObjectURL(blob);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        onExportToChat(imageUrl, base64, "image/png");
                    };
                    reader.readAsDataURL(blob);
                } catch (error) {
                    console.error("Error exporting Excalidraw:", error);
                    alert("Erro ao exportar o diagrama.");
                } finally {
                    setIsExporting(false);
                }
            },
            getSceneData: () => {
                if (!excalidrawAPI) return null;
                return {
                    elements: excalidrawAPI.getSceneElements(),
                    appState: excalidrawAPI.getAppState(),
                    files: excalidrawAPI.getFiles(),
                };
            }
        }), [excalidrawAPI, theme, onExportToChat]);

        return (
            <div className="h-full w-full relative">
                <React.Suspense fallback={
                    <div className="h-full w-full flex items-center justify-center bg-gray-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-gray-600 font-medium">Carregando Excalidraw...</p>
                        </div>
                    </div>
                }>
                    <ExcalidrawLazy
                        excalidrawAPI={(api) => setExcalidrawAPI(api)}
                        initialData={initialData || undefined}
                        theme={theme}
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

                {isExporting && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-gray-700 font-medium">Exportando diagrama...</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

ExcalidrawWrapper.displayName = 'ExcalidrawWrapper';

export default ExcalidrawWrapper;
