import React, { useState, useEffect } from 'react';
import { FileNode } from '../types';

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (file: FileNode) => void;
  onToggleFolder: (id: string, isOpen: boolean) => void;
  selectedFileId: string | null;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  onSelectFile: (file: FileNode) => void;
  onToggleFolder: (id: string, isOpen: boolean) => void;
  selectedFileId: string | null;
  level: number;
}> = ({ node, onSelectFile, onToggleFolder, selectedFileId, level }) => {
  const isOpen = node.isOpen || false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      onToggleFolder(node.id, !isOpen);
    } else {
      onSelectFile(node);
    }
  };

  const isSelected = selectedFileId === node.id;
  const paddingLeft = `${level * 12 + 12}px`;

  return (
    <div className="select-none text-sm">
      <div
        className={`flex items-center py-1.5 px-2 cursor-pointer transition-colors duration-200 min-w-0 ${isSelected
          ? 'bg-blue-100 text-blue-700 font-medium'
          : 'hover:bg-gray-100 text-gray-600'
          }`}
        style={{ paddingLeft }}
        onClick={handleClick}
      >
        <span className="mr-2 w-4 text-center">
          {node.type === 'folder' && (
            <i
              className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''
                }`}
            ></i>
          )}
        </span>
        <span className="mr-2">
          {node.type === 'folder' ? (
            <i className={`fa-regular ${isOpen ? 'fa-folder-open' : 'fa-folder'} text-yellow-500`}></i>
          ) : node.fileType === 'pdf' ? (
            <i className="fa-solid fa-file-pdf text-red-500"></i>
          ) : (
            <i className="fa-regular fa-file-lines text-gray-400"></i>
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
              selectedFileId={selectedFileId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile, onToggleFolder, selectedFileId }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto pb-4">
      {nodes.map((node) => (
        <FileTreeNode
          key={node.id}
          node={node}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
          selectedFileId={selectedFileId}
          level={0}
        />
      ))}
    </div>
  );
};

export default FileTree;