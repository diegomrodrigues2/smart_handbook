import React from 'react';
import FileTree from '../FileTree';
import SearchBar from './SearchBar';
import SidebarToolbar from './SidebarToolbar';
import SubjectModeSelector from '../SubjectModeSelector';
import { FileNode } from '../../types';

interface SidebarProps {
    isOpen: boolean;
    width: number;
    isResizing: boolean;
    onStartResizing: (e: React.MouseEvent) => void;
    title: string;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    filteredFiles: FileNode[];
    selectedFileId: string | null;
    onSelectFile: (node: FileNode) => void;
    onToggleFolder: (id: string, isOpen: boolean) => void;
    onNewFile: () => void;
    onNewFolder: () => void;
    onLoadDirectory: () => void;
    onRefresh?: () => void;
    onCollapse: () => void;
    showRefresh: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    width,
    isResizing,
    onStartResizing,
    title,
    searchQuery,
    onSearchChange,
    filteredFiles,
    selectedFileId,
    onSelectFile,
    onToggleFolder,
    onNewFile,
    onNewFolder,
    onLoadDirectory,
    onRefresh,
    onCollapse,
    showRefresh
}) => {
    return (
        <div
            style={{ width: isOpen ? width : 0 }}
            className={`${!isResizing ? 'transition-[width] duration-300 ease-in-out' : ''} border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0 relative`}
        >
            {isOpen && (
                <div
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400/30 transition-colors z-20"
                    onMouseDown={onStartResizing}
                />
            )}

            {/* Header */}
            <div className="h-12 flex items-center px-4 border-b border-gray-200 flex-shrink-0">
                <i className="fa-solid fa-book-open text-blue-600 mr-2"></i>
                <span className="font-semibold text-gray-700 truncate">{title}</span>
            </div>

            {/* Subject Mode Selector */}
            <SubjectModeSelector />

            {/* Search */}
            <SearchBar value={searchQuery} onChange={onSearchChange} />

            {/* Toolbar */}
            <SidebarToolbar
                onNewFile={onNewFile}
                onNewFolder={onNewFolder}
                onLoadDirectory={onLoadDirectory}
                onRefresh={onRefresh}
                onCollapse={onCollapse}
                showRefresh={showRefresh}
            />

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto">
                {filteredFiles.length > 0 ? (
                    <FileTree
                        nodes={filteredFiles}
                        onSelectFile={onSelectFile}
                        onToggleFolder={onToggleFolder}
                        selectedFileId={selectedFileId}
                    />
                ) : (
                    <div className="p-4 text-center text-gray-400 text-xs mt-4">
                        No documents found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
