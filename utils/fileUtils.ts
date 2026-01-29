import { FileNode } from '../types';

/**
 * Find a node by ID recursively in a file tree
 */
export const findNode = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Find the first file in a tree structure
 */
export const findFirstFile = (nodes: FileNode[]): string | null => {
    for (const n of nodes) {
        if (n.type === 'file') return n.id;
        if (n.children) {
            const found = findFirstFile(n.children);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Filter nodes by search query (matches name or content)
 */
export const filterNodesByQuery = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();

    const filterNodes = (nodes: FileNode[]): FileNode[] => {
        return nodes.reduce<FileNode[]>((acc, node) => {
            if (node.type === 'file') {
                const matchName = node.name.toLowerCase().includes(lowerQuery);
                const matchContent = node.content?.toLowerCase().includes(lowerQuery);

                if (matchName || matchContent) {
                    acc.push(node);
                }
            } else if (node.type === 'folder' && node.children) {
                const filteredChildren = filterNodes(node.children);
                if (filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren,
                        isOpen: true
                    });
                }
            }
            return acc;
        }, []);
    };

    return filterNodes(nodes);
};

/**
 * Update a specific node in the tree (immutable)
 */
export const updateNodeById = <T extends Partial<FileNode>>(
    nodes: FileNode[],
    id: string,
    updates: T
): FileNode[] => {
    return nodes.map((node) => {
        if (node.id === id) {
            return { ...node, ...updates };
        }
        if (node.children) {
            return { ...node, children: updateNodeById(node.children, id, updates) };
        }
        return node;
    });
};

/**
 * Capture open folder states from a file tree
 */
export const captureOpenStates = (nodes: FileNode[]): Map<string, boolean> => {
    const openStates = new Map<string, boolean>();

    const capture = (nodes: FileNode[]) => {
        nodes.forEach(n => {
            if (n.type === 'folder' && n.isOpen) openStates.set(n.id, true);
            if (n.children) capture(n.children);
        });
    };

    capture(nodes);
    return openStates;
};

/**
 * Apply open states to a file tree
 */
export const applyOpenStates = (nodes: FileNode[], openStates: Map<string, boolean>): void => {
    nodes.forEach(n => {
        if (n.type === 'folder' && openStates.has(n.id)) n.isOpen = true;
        if (n.children) applyOpenStates(n.children, openStates);
    });
};
