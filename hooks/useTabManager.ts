import { useState, useCallback } from 'react';
import { Tab, FileNode, StudyModeType } from '../types';

interface UseTabManagerReturn {
    tabs: Tab[];
    activeTabId: string | null;
    openTab: (file: FileNode, isPinned: boolean) => void;
    closeTab: (tabId: string) => void;
    pinTab: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    openStudyModeTab: (file: FileNode, modeType: StudyModeType) => void;
    closeStudyModeForFile: (fileId: string) => void;
    getActiveTab: () => Tab | null;
    getActiveFile: () => { fileId: string; isStudyMode: boolean; studyModeType?: StudyModeType } | null;
}

export function useTabManager(): UseTabManagerReturn {
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // Generate unique tab ID
    const generateTabId = useCallback((fileId: string, isStudyMode: boolean, studyModeType?: StudyModeType) => {
        if (isStudyMode && studyModeType) {
            return `${fileId}-${studyModeType}`;
        }
        return fileId;
    }, []);

    // Find preview tab (unpinned, non-study-mode tab)
    const findPreviewTab = useCallback(() => {
        return tabs.find(tab => !tab.isPinned && !tab.isStudyMode);
    }, [tabs]);

    // Open a tab - implements preview/pinned logic
    const openTab = useCallback((file: FileNode, isPinned: boolean) => {
        const tabId = generateTabId(file.id, false);

        setTabs(prevTabs => {
            // Check if tab already exists
            const existingTab = prevTabs.find(t => t.id === tabId);

            if (existingTab) {
                // If exists and we're pinning, update isPinned
                if (isPinned && !existingTab.isPinned) {
                    return prevTabs.map(t =>
                        t.id === tabId ? { ...t, isPinned: true } : t
                    );
                }
                // Just switch to existing tab
                return prevTabs;
            }

            // If not pinned, replace existing preview tab
            if (!isPinned) {
                const previewTab = prevTabs.find(t => !t.isPinned && !t.isStudyMode);
                if (previewTab) {
                    return prevTabs.map(t =>
                        t.id === previewTab.id
                            ? {
                                id: tabId,
                                fileId: file.id,
                                name: file.name,
                                isPinned: false,
                                isStudyMode: false,
                                fileType: file.fileType
                            }
                            : t
                    );
                }
            }

            // Add new tab
            const newTab: Tab = {
                id: tabId,
                fileId: file.id,
                name: file.name,
                isPinned: isPinned,
                isStudyMode: false,
                fileType: file.fileType
            };

            return [...prevTabs, newTab];
        });

        setActiveTabId(tabId);
    }, [generateTabId]);

    // Close a specific tab
    const closeTab = useCallback((tabId: string) => {
        setTabs(prevTabs => {
            const tabIndex = prevTabs.findIndex(t => t.id === tabId);
            const newTabs = prevTabs.filter(t => t.id !== tabId);

            // If closing active tab, activate adjacent tab
            if (tabId === activeTabId && newTabs.length > 0) {
                const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
                setActiveTabId(newTabs[newActiveIndex].id);
            } else if (newTabs.length === 0) {
                setActiveTabId(null);
            }

            return newTabs;
        });
    }, [activeTabId]);

    // Pin a tab (convert preview to pinned)
    const pinTab = useCallback((tabId: string) => {
        setTabs(prevTabs =>
            prevTabs.map(t =>
                t.id === tabId ? { ...t, isPinned: true } : t
            )
        );
    }, []);

    // Set active tab
    const setActiveTabHandler = useCallback((tabId: string) => {
        setActiveTabId(tabId);
    }, []);

    // Open a study mode as a tab
    const openStudyModeTab = useCallback((file: FileNode, modeType: StudyModeType) => {
        const tabId = generateTabId(file.id, true, modeType);

        setTabs(prevTabs => {
            // Check if study mode tab already exists for this file+mode
            const existingTab = prevTabs.find(t => t.id === tabId);
            if (existingTab) {
                return prevTabs;
            }

            // Study mode tabs are always pinned
            const newTab: Tab = {
                id: tabId,
                fileId: file.id,
                name: `${getStudyModeName(modeType)}: ${file.name}`,
                isPinned: true,
                isStudyMode: true,
                studyModeType: modeType,
                fileType: file.fileType
            };

            return [...prevTabs, newTab];
        });

        setActiveTabId(tabId);
    }, [generateTabId]);

    // Close study mode for a file
    const closeStudyModeForFile = useCallback((fileId: string) => {
        setTabs(prevTabs => {
            const tabToClose = prevTabs.find(t => t.fileId === fileId && t.isStudyMode && t.id === activeTabId);
            if (!tabToClose) return prevTabs;

            const tabIndex = prevTabs.findIndex(t => t.id === tabToClose.id);
            const newTabs = prevTabs.filter(t => t.id !== tabToClose.id);

            if (newTabs.length > 0) {
                const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
                setActiveTabId(newTabs[newActiveIndex].id);
            } else {
                setActiveTabId(null);
            }

            return newTabs;
        });
    }, [activeTabId]);

    // Get the active tab object
    const getActiveTab = useCallback(() => {
        return tabs.find(t => t.id === activeTabId) || null;
    }, [tabs, activeTabId]);

    // Get active file info
    const getActiveFile = useCallback(() => {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) return null;

        return {
            fileId: activeTab.fileId,
            isStudyMode: activeTab.isStudyMode,
            studyModeType: activeTab.studyModeType
        };
    }, [tabs, activeTabId]);

    return {
        tabs,
        activeTabId,
        openTab,
        closeTab,
        pinTab,
        setActiveTab: setActiveTabHandler,
        openStudyModeTab,
        closeStudyModeForFile,
        getActiveTab,
        getActiveFile
    };
}

// Helper function to get display name for study modes
function getStudyModeName(mode: StudyModeType): string {
    const names: Record<StudyModeType, string> = {
        learning: 'Aprendizado',
        lesson: 'Aula',
        workbook: 'Exercícios',
        challenge: 'Desafio',
        interview: 'Entrevista',
        pairProgramming: 'Pair Programming',
        conceptExtraction: 'Extração',
        excalidraw: 'Desenho',
        drawio: 'Diagrama',
        projectSpec: 'Especificação'
    };
    return names[mode];
}

export default useTabManager;
