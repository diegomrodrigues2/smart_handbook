import React, { useRef, useCallback, useState, useEffect } from 'react';
import { FileNode } from '../types';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  nodeName: string;
  type: 'file' | 'folder';
}

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (file: FileNode, isPinned: boolean) => void;
  onToggleFolder: (id: string, isOpen: boolean) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onGenerateRoteiro?: (folderIds: string[]) => void;
  onDeleteItems?: (ids: string[]) => void;
  onMoveItems?: (ids: string[], targetFolderId: string) => void;
  onGroupInFolder?: (ids: string[]) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (fileId: string) => void;
  onRenameItem?: (id: string, name: string) => void;
  onCreateNote?: (folderId: string) => void;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  onSelectFile: (file: FileNode, isPinned: boolean) => void;
  onToggleFolder: (id: string, isOpen: boolean) => void;
  selectedIds: Set<string>;
  level: number;
  onContextMenu?: (e: React.MouseEvent, nodeId: string, nodeName: string, type: 'file' | 'folder') => void;
  onSelect: (e: React.MouseEvent, nodeId: string) => void;
  onDragStart: (e: React.DragEvent, nodeId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, nodeId: string) => void;
  favorites?: Set<string>;
}> = ({ node, onSelectFile, onToggleFolder, selectedIds, level, onContextMenu, onSelect, onDragStart, onDragOver, onDrop, favorites }) => {
  const isOpen = node.isOpen || false;
  const clickTimeoutRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);

  // Handle click with single/double click detection
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    // Notify parent for selection logic
    onSelect(e, node.id);

    if (node.type === 'folder') {
      onToggleFolder(node.id, !isOpen);
      return;
    }

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      // Wait to see if it's a double click
      clickTimeoutRef.current = window.setTimeout(() => {
        // Single click - open as preview (not pinned)
        if (clickCountRef.current === 1) {
          onSelectFile(node, false);
        }
        clickCountRef.current = 0;
      }, 200);
    } else if (clickCountRef.current === 2) {
      // Double click - open as pinned
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      onSelectFile(node, true);
      clickCountRef.current = 0;
    }
  }, [node, isOpen, onToggleFolder, onSelectFile, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, node.id, node.name, node.type);
    }
  }, [node, onContextMenu]);

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, node.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (node.type === 'folder') {
      onDrop(e, node.id);
    }
  };

  const isSelected = selectedIds.has(node.id);
  const paddingLeft = `${level * 12 + 12}px`;
  const isFavorite = favorites?.has(node.id);

  return (
    <div className="select-none text-sm">
      <div
        className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors duration-200 min-w-0 ${isSelected
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'hover:bg-gray-100 text-gray-600'
          }`}
        style={{ paddingLeft }}
        draggable="true"
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <span className="mr-2 w-4 text-center">
          {node.type === 'folder' && (
            <i
              className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''
                }`}
            ></i>
          )}
        </span>
        <span className="mr-2 relative">
          {node.type === 'folder' ? (
            <i className={`fa-regular ${isOpen ? 'fa-folder-open' : 'fa-folder'} text-yellow-500`}></i>
          ) : node.fileType === 'pdf' ? (
            <i className="fa-solid fa-file-pdf text-red-500"></i>
          ) : (
            <i className="fa-regular fa-file-lines text-gray-400"></i>
          )}
          {isFavorite && (
            <i className="fa-solid fa-star text-yellow-500 text-[8px] absolute -top-1 -right-1"></i>
          )}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              onSelectFile={onSelectFile}
              onToggleFolder={onToggleFolder}
              selectedIds={selectedIds}
              level={level + 1}
              onContextMenu={onContextMenu}
              onSelect={onSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              favorites={favorites}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  onSelectFile,
  onToggleFolder,
  selectedIds,
  onSelectionChange,
  onGenerateRoteiro,
  onDeleteItems,
  onMoveItems,
  onGroupInFolder,
  favorites,
  onToggleFavorite,
  onRenameItem,
  onCreateNote
}) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: '',
    nodeName: '',
    type: 'file'
  });

  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Flatten nodes for range selection
  const flattenNodes = useCallback((nodes: FileNode[]): string[] => {
    let result: string[] = [];
    nodes.forEach(node => {
      result.push(node.id);
      if (node.type === 'folder' && node.isOpen && node.children) {
        result.push(...flattenNodes(node.children));
      }
    });
    return result;
  }, []);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string, nodeName: string, type: 'file' | 'folder') => {
    // If current node is not selected, select only this one
    if (!selectedIds.has(nodeId)) {
      onSelectionChange(new Set([nodeId]));
      setLastSelectedId(nodeId);
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      nodeId,
      nodeName,
      type
    });
  }, [selectedIds, onSelectionChange]);

  const handleNodeClick = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    const newSelected = new Set(selectedIds);

    if (e.shiftKey && lastSelectedId) {
      // Range selection
      const allPathIds = flattenNodes(nodes);
      const startIndex = allPathIds.indexOf(lastSelectedId);
      const endIndex = allPathIds.indexOf(nodeId);

      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        const range = allPathIds.slice(start, end + 1);
        range.forEach(id => newSelected.add(id));
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      if (newSelected.has(nodeId)) {
        newSelected.delete(nodeId);
      } else {
        newSelected.add(nodeId);
      }
    } else {
      // Single selection
      newSelected.clear();
      newSelected.add(nodeId);
    }

    onSelectionChange(newSelected);
    setLastSelectedId(nodeId);
  }, [nodes, selectedIds, lastSelectedId, onSelectionChange, flattenNodes]);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    // If dragging an unselected node, select it first
    if (!selectedIds.has(nodeId)) {
      onSelectionChange(new Set([nodeId]));
    }

    // We'll use the selectedIds from the parent to move items
    e.dataTransfer.setData('text/plain', JSON.stringify(Array.from(selectedIds)));
    e.dataTransfer.effectAllowed = 'move';
  }, [selectedIds, onSelectionChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data) {
      try {
        const ids = JSON.parse(data);
        if (onMoveItems) {
          onMoveItems(ids, targetFolderId);
        }
      } catch (err) {
        console.error('Error parsing drag data:', err);
      }
    }
  }, [onMoveItems]);

  const handleGenerateRoteiroAction = useCallback(() => {
    if (onGenerateRoteiro && selectedIds.size > 0) {
      onGenerateRoteiro(Array.from(selectedIds));
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onGenerateRoteiro, selectedIds]);

  const handleDeleteAction = useCallback(() => {
    if (onDeleteItems && selectedIds.size > 0) {
      onDeleteItems(Array.from(selectedIds));
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onDeleteItems, selectedIds]);

  const handleGroupInFolderAction = useCallback(() => {
    if (onGroupInFolder && selectedIds.size > 0) {
      onGroupInFolder(Array.from(selectedIds));
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onGroupInFolder, selectedIds]);

  const handleToggleFavoriteAction = useCallback(() => {
    if (onToggleFavorite && contextMenu.nodeId) {
      onToggleFavorite(contextMenu.nodeId);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onToggleFavorite, contextMenu.nodeId]);

  const handleCreateNoteAction = useCallback(() => {
    if (onCreateNote && contextMenu.nodeId && contextMenu.type === 'folder') {
      onCreateNote(contextMenu.nodeId);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onCreateNote, contextMenu]);

  const handleRenameAction = useCallback(() => {
    if (onRenameItem && contextMenu.nodeId) {
      onRenameItem(contextMenu.nodeId, contextMenu.nodeName);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onRenameItem, contextMenu]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-4 relative">
      {nodes.map((node) => (
        <FileTreeNode
          key={node.id}
          node={node}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
          selectedIds={selectedIds}
          level={0}
          onContextMenu={handleNodeContextMenu}
          onSelect={handleNodeClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          favorites={favorites}
        />
      ))}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleGenerateRoteiroAction}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <i className="fa-solid fa-route text-blue-500"></i>
            <span>Gerar Roteiro de Estudos</span>
          </button>

          <button
            onClick={handleGroupInFolderAction}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <i className="fa-solid fa-folder-plus text-yellow-500"></i>
            <span>Agrupar em Pasta</span>
          </button>

          {contextMenu.type === 'folder' && (
            <button
              onClick={handleCreateNoteAction}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <i className="fa-solid fa-file-circle-plus text-green-500"></i>
              <span>Nova Nota</span>
            </button>
          )}

          <button
            onClick={handleRenameAction}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <i className="fa-solid fa-pen-to-square text-gray-500"></i>
            <span>Renomear</span>
          </button>

          <button
            onClick={handleDeleteAction}
            className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 text-gray-700 hover:text-red-600 transition-colors"
          >
            <i className="fa-solid fa-trash text-red-500"></i>
            <span>Deletar</span>
          </button>

          {selectedIds.size === 1 && (
            <button
              onClick={handleToggleFavoriteAction}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <i className={`fa-${favorites?.has(contextMenu.nodeId) ? 'solid' : 'regular'} fa-star text-yellow-500`}></i>
              <span>{favorites?.has(contextMenu.nodeId) ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileTree;
