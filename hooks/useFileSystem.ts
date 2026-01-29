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

    return {
        fileStructure,
        setFileStructure,
        directoryHandle,
        imageHandles,
        pdfHandles,
        handleLoadDirectory,
        handleRefresh,
        isRestoring
    };
};
