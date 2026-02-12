import { useState, useCallback, useEffect } from 'react';
import { FileNode } from '../types';
import { findFirstFile, captureOpenStates, applyOpenStates } from '../utils/fileUtils';
import { saveDirectoryHandle, loadDirectoryHandle } from '../utils/storageUtils';
import { loadMetadata } from '../services/pdfMetadataService';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const PDF_EXTENSION = '.pdf';

interface UseFileSystemReturn {
    fileStructure: FileNode[];
    setFileStructure: React.Dispatch<React.SetStateAction<FileNode[]>>;
    directoryHandle: FileSystemDirectoryHandle | null;
    imageHandles: Map<string, FileSystemFileHandle>;
    pdfHandles: Map<string, FileSystemFileHandle>;
    handleLoadDirectory: () => Promise<string | null>;
    handleRefresh: () => Promise<void>;
    deleteItems: (ids: string[]) => Promise<void>;
    moveItems: (ids: string[], targetFolderId: string) => Promise<void>;
    groupItemsInFolder: (ids: string[], folderName: string) => Promise<void>;
    renameItem: (id: string, newName: string) => Promise<void>;
    createFileInFolder: (folderId: string, fileName: string, initialContent?: string) => Promise<void>;
    saveFileContent: (fileId: string, content: string) => Promise<void>;
    isRestoring: boolean;
}

export const useFileSystem = (): UseFileSystemReturn => {
    const [fileStructure, setFileStructure] = useState<FileNode[]>([]);
    const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [imageHandles, setImageHandles] = useState<Map<string, FileSystemFileHandle>>(new Map());
    const [pdfHandles, setPdfHandles] = useState<Map<string, FileSystemFileHandle>>(new Map());
    const [isRestoring, setIsRestoring] = useState(true);

    const processDirectoryHandle = async (
        handle: any,
        parentPath: string = '',
        imgMap: Map<string, FileSystemFileHandle> = new Map(),
        pdfMap: Map<string, FileSystemFileHandle> = new Map()
    ): Promise<FileNode> => {
        const currentPath = parentPath ? `${parentPath}/${handle.name}` : handle.name;
        const node: FileNode = {
            id: currentPath,
            name: handle.name,
            type: 'folder' as const,
            children: [],
            isOpen: false
        };

        for await (const entry of handle.values()) {
            const entryPath = `${currentPath}/${entry.name}`;
            if (entry.kind === 'file') {
                const lowerName = entry.name.toLowerCase();
                if (lowerName.endsWith('.md')) {
                    const file = await entry.getFile();
                    const content = await file.text();
                    node.children!.push({
                        id: entryPath,
                        name: entry.name,
                        type: 'file' as const,
                        fileType: 'markdown',
                        content
                    });
                } else if (lowerName.endsWith(PDF_EXTENSION)) {
                    // Store PDF file handle
                    pdfMap.set(entryPath, entry);

                    // Try to load metadata for this PDF
                    let pdfMetadata = null;
                    try {
                        pdfMetadata = await loadMetadata(handle, entry.name);
                    } catch (error) {
                        console.log(`No metadata for ${entry.name}`);
                    }

                    node.children!.push({
                        id: entryPath,
                        name: entry.name,
                        type: 'file' as const,
                        fileType: 'pdf',
                        pdfMetadata: pdfMetadata || undefined
                    });
                } else if (IMAGE_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
                    imgMap.set(entryPath, entry);
                }
            } else if (entry.kind === 'directory') {
                const childFolder = await processDirectoryHandle(entry, currentPath, imgMap, pdfMap);
                if (childFolder.children && childFolder.children.length > 0) {
                    node.children!.push(childFolder);
                }
            }
        }

        node.children!.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;

            // Natural sort: extract leading numbers and compare numerically
            const numA = a.name.match(/^(\d+)/);
            const numB = b.name.match(/^(\d+)/);

            if (numA && numB) {
                const diff = parseInt(numA[1], 10) - parseInt(numB[1], 10);
                if (diff !== 0) return diff;
            }

            return a.name.localeCompare(b.name);
        });

        return node;
    };

    // Try to restore last opened directory on mount
    useEffect(() => {
        const restoreLastDirectory = async () => {
            try {
                const savedHandle = await loadDirectoryHandle();
                if (savedHandle) {
                    // Request permission to access the directory
                    const permission = await (savedHandle as any).requestPermission({ mode: 'read' });
                    if (permission === 'granted') {
                        setDirectoryHandle(savedHandle);
                        const imgMap = new Map<string, FileSystemFileHandle>();
                        const pdfMap = new Map<string, FileSystemFileHandle>();
                        const rootNode = await processDirectoryHandle(savedHandle, '', imgMap, pdfMap);
                        setImageHandles(imgMap);
                        setPdfHandles(pdfMap);
                        setFileStructure([rootNode]);
                    }
                }
            } catch (error) {
                console.log('Could not restore last directory:', error);
            } finally {
                setIsRestoring(false);
            }
        };

        restoreLastDirectory();
    }, []);

    const handleLoadDirectory = useCallback(async (): Promise<string | null> => {
        try {
            const handle = await (window as any).showDirectoryPicker();
            setDirectoryHandle(handle);

            // Save handle for future sessions
            await saveDirectoryHandle(handle);

            const imgMap = new Map<string, FileSystemFileHandle>();
            const pdfMap = new Map<string, FileSystemFileHandle>();
            const rootNode = await processDirectoryHandle(handle, '', imgMap, pdfMap);
            setImageHandles(imgMap);
            setPdfHandles(pdfMap);
            setFileStructure([rootNode]);

            return findFirstFile([rootNode]);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Error loading directory:', error);
            }
            return null;
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        if (!directoryHandle) return;

        try {
            const openStates = captureOpenStates(fileStructure);

            const rootImgMap = new Map<string, FileSystemFileHandle>();
            const rootPdfMap = new Map<string, FileSystemFileHandle>();
            const rootNode = await processDirectoryHandle(directoryHandle, '', rootImgMap, rootPdfMap);
            setImageHandles(rootImgMap);
            setPdfHandles(rootPdfMap);

            applyOpenStates([rootNode], openStates);

            setFileStructure([rootNode]);
        } catch (error) {
            console.error('Error refreshing directory:', error);
        }
    }, [directoryHandle, fileStructure]);

    const deleteItems = useCallback(async (ids: string[]) => {
        if (!directoryHandle) return;

        const confirmDelete = window.confirm(`Deseja realmente deletar ${ids.length} item(ns)?`);
        if (!confirmDelete) return;

        try {
            for (const id of ids) {
                const parts = id.split('/');
                const fileName = parts.pop()!;
                const pathSegments = parts.slice(1);

                let currentHandle = directoryHandle;
                for (const segment of pathSegments) {
                    currentHandle = await currentHandle.getDirectoryHandle(segment);
                }

                await currentHandle.removeEntry(fileName, { recursive: true });
            }
            await handleRefresh();
        } catch (error) {
            console.error('Error deleting items:', error);
            alert('Erro ao deletar itens. Verifique as permissões.');
        }
    }, [directoryHandle, handleRefresh]);

    const moveItems = useCallback(async (ids: string[], targetFolderId: string) => {
        if (!directoryHandle) return;

        try {
            // Target folder handle
            const targetParts = targetFolderId.split('/');
            let targetHandle = directoryHandle;
            // If targetFolderId is the root folder name, we are already at directoryHandle
            // Otherwise, navigate to it.
            const targetSegments = targetParts.slice(1);
            for (const segment of targetSegments) {
                if (!segment) continue;
                targetHandle = await targetHandle.getDirectoryHandle(segment);
            }

            for (const id of ids) {
                // Don't move a folder into itself or its children
                if (targetFolderId.startsWith(id)) {
                    console.warn(`Cannot move folder ${id} into its own child ${targetFolderId}`);
                    continue;
                }

                const parts = id.split('/');
                const fileName = parts.pop()!;
                const sourcePathSegments = parts.slice(1);

                let sourceParentHandle = directoryHandle;
                for (const segment of sourcePathSegments) {
                    sourceParentHandle = await sourceParentHandle.getDirectoryHandle(segment);
                }

                const entry = await sourceParentHandle.getFileHandle(fileName).catch(() => null)
                    || await sourceParentHandle.getDirectoryHandle(fileName).catch(() => null);

                if (!entry) continue;

                // Move is implemented as copy + delete because FileSystemHandle doesn't have move yet in all browsers
                // However, for single files we might use move() if available (Chromium 100+)
                if (entry.kind === 'file' && (entry as any).move) {
                    await (entry as any).move(targetHandle, fileName);
                } else {
                    // Manual recursive copy and delete for directories or files without .move()
                    await copyRecursive(entry, targetHandle);
                    await sourceParentHandle.removeEntry(fileName, { recursive: true });
                }
            }
            await handleRefresh();
        } catch (error) {
            console.error('Error moving items:', error);
            alert('Erro ao mover itens.');
        }
    }, [directoryHandle, handleRefresh]);

    const groupItemsInFolder = useCallback(async (ids: string[], folderName: string) => {
        if (!directoryHandle || ids.length === 0) return;

        try {
            // Determine the common parent of selected items to create the folder there
            // For simplicity, we'll use the parent of the first item
            const firstIdParts = ids[0].split('/');
            firstIdParts.pop();
            const parentPath = firstIdParts.join('/');
            const parentSegments = firstIdParts.slice(1);

            let parentHandle = directoryHandle;
            for (const segment of parentSegments) {
                if (!segment) continue;
                parentHandle = await parentHandle.getDirectoryHandle(segment);
            }

            const newFolderHandle = await parentHandle.getDirectoryHandle(folderName, { create: true });

            // Move items into the new folder
            // We use targetFolderId as parentPath + '/' + folderName
            const targetFolderId = `${parentPath}/${folderName}`;
            await moveItems(ids, targetFolderId);

        } catch (error) {
            console.error('Error grouping items:', error);
            alert('Erro ao agrupar itens em pasta.');
        }
    }, [directoryHandle, moveItems]);

    // Helper for recursive copy
    const copyRecursive = async (sourceHandle: FileSystemHandle, targetDirHandle: FileSystemDirectoryHandle) => {
        if (sourceHandle.kind === 'file') {
            const fileHandle = sourceHandle as FileSystemFileHandle;
            const file = await fileHandle.getFile();
            const newFileHandle = await targetDirHandle.getFileHandle(sourceHandle.name, { create: true });
            const writable = await (newFileHandle as any).createWritable();
            await writable.write(file);
            await writable.close();
        } else {
            const dirHandle = sourceHandle as FileSystemDirectoryHandle;
            const newDirHandle = await targetDirHandle.getDirectoryHandle(sourceHandle.name, { create: true });
            for await (const entry of (dirHandle as any).values()) {
                await copyRecursive(entry, newDirHandle);
            }
        }
    };

    const renameItem = useCallback(async (id: string, newName: string) => {
        if (!directoryHandle) return;

        try {
            const parts = id.split('/');
            const oldName = parts.pop()!;
            const parentSegments = parts.slice(1);

            let parentHandle = directoryHandle;
            for (const segment of parentSegments) {
                if (!segment) continue;
                parentHandle = await parentHandle.getDirectoryHandle(segment);
            }

            const entry = await parentHandle.getFileHandle(oldName).catch(() => null)
                || await parentHandle.getDirectoryHandle(oldName).catch(() => null);

            if (!entry) throw new Error('Item not found');

            // Try using the move method if available (supports renaming)
            if ((entry as any).move) {
                await (entry as any).move(parentHandle, newName);
            } else {
                // Fallback: copy to new name, then delete old
                if (entry.kind === 'file') {
                    const file = await (entry as FileSystemFileHandle).getFile();
                    const newFileHandle = await parentHandle.getFileHandle(newName, { create: true });
                    const writable = await (newFileHandle as any).createWritable();
                    await writable.write(file);
                    await writable.close();
                    await parentHandle.removeEntry(oldName);
                } else {
                    const newDirHandle = await parentHandle.getDirectoryHandle(newName, { create: true });
                    await copyRecursive(entry, newDirHandle);
                    await parentHandle.removeEntry(oldName, { recursive: true });
                }
            }

            await handleRefresh();
        } catch (error) {
            console.error('Error renaming item:', error);
            alert('Erro ao renomear item.');
        }
    }, [directoryHandle, handleRefresh]);

    const createFileInFolder = useCallback(async (folderId: string, fileName: string, initialContent: string = '') => {
        if (!directoryHandle) return;

        try {
            const parts = folderId.split('/');
            // If folderId is just the root folder (e.g. "docs"), logic handles it
            const pathSegments = parts.slice(1);

            let currentHandle = directoryHandle;
            for (const segment of pathSegments) {
                if (!segment) continue;
                currentHandle = await currentHandle.getDirectoryHandle(segment);
            }

            const newFileHandle = await currentHandle.getFileHandle(fileName, { create: true });
            const writable = await (newFileHandle as any).createWritable();
            await writable.write(initialContent);
            await writable.close();

            await handleRefresh();
        } catch (error) {
            console.error('Error creating file:', error);
            alert('Erro ao criar arquivo.');
        }
    }, [directoryHandle, handleRefresh]);

    // Save content of an existing markdown file back to disk
    const saveFileContent = useCallback(async (fileId: string, content: string) => {
        if (!directoryHandle) return;

        try {
            // fileId is a path like "rootFolder/subfolder/file.md"
            const parts = fileId.split('/');
            const fileName = parts.pop()!;
            // Skip the root folder name (index 0) — it maps to directoryHandle itself
            const pathSegments = parts.slice(1);

            let currentHandle: FileSystemDirectoryHandle = directoryHandle;
            for (const segment of pathSegments) {
                if (!segment) continue;
                currentHandle = await currentHandle.getDirectoryHandle(segment);
            }

            const fileHandle = await currentHandle.getFileHandle(fileName);
            const writable = await (fileHandle as any).createWritable();
            await writable.write(content);
            await writable.close();
        } catch (error) {
            console.error('Error saving file to disk:', error);
        }
    }, [directoryHandle]);

    return {
        fileStructure,
        setFileStructure,
        directoryHandle,
        imageHandles,
        pdfHandles,
        handleLoadDirectory,
        handleRefresh,
        deleteItems,
        moveItems,
        groupItemsInFolder,
        renameItem,
        createFileInFolder,
        saveFileContent,
        isRestoring
    };
};
