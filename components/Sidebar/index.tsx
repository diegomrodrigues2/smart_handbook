import React, { useState } from 'react';
import FileTree from '../FileTree';
import SearchBar from './SearchBar';
import SidebarToolbar from './SidebarToolbar';
import SubjectModeSelector from '../SubjectModeSelector';
import TableOfContents from './TableOfContents';
import { FileNode } from '../../types';

type SidebarView = 'files' | 'toc';

interface SidebarProps {
    isOpen: boolean;
    width: number;
    isResizing: boolean;
    onStartResizing: (e: React.MouseEvent) => void;
    title: string;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    filteredFiles: FileNode[];
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    onSelectFile: (node: FileNode, isPinned: boolean) => void;
    onToggleFolder: (id: string, isOpen: boolean) => void;
    onNewFile: () => void;
    onNewFolder: () => void;
    onLoadDirectory: () => void;
    onRefresh?: () => void;
    onCollapse: () => void;
    showRefresh: boolean;
    onGenerateRoteiro?: (folderIds: string[]) => void;
    onDeleteItems?: (ids: string[]) => void;
    onMoveItems?: (ids: string[], targetFolderId: string) => void;
    onGroupInFolder?: (ids: string[]) => void;
    showFavorites: boolean;
    onToggleFavoritesView: () => void;
    favorites: Set<string>;
    onToggleFavorite: (fileId: string) => void;
    onRenameItem?: (id: string, name: string) => void;
    onCreateNote?: (folderId: string) => void;
    onOpenSettings?: () => void;
    activeNoteContent?: string | null;
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
    selectedIds,
    onSelectionChange,
    onSelectFile,
    onToggleFolder,
    onNewFile,
    onNewFolder,
    onLoadDirectory,
    onRefresh,
    onCollapse,
    showRefresh,
    onGenerateRoteiro,
    onDeleteItems,
    onMoveItems,
    onGroupInFolder,
    showFavorites,
    onToggleFavoritesView,
    favorites,
    onToggleFavorite,
    onRenameItem,
    onCreateNote,
    onOpenSettings,
    activeNoteContent
}) => {
    const [activeView, setActiveView] = useState<SidebarView>('files');

    const hasContent = !!activeNoteContent;
    const effectiveView = activeView === 'toc' && !hasContent ? 'files' : activeView;

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

            {/* View Toggle — Files / TOC */}
            <div className="px-2 pt-2 pb-1 flex-shrink-0">
                <div className="flex bg-gray-200/70 rounded-lg p-0.5">
                    <button
                        onClick={() => setActiveView('files')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-200 ${effectiveView === 'files'
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <i className="fa-solid fa-folder-tree text-[10px]"></i>
                        <span>Arquivos</span>
                    </button>
                    <button
                        onClick={() => setActiveView('toc')}
                        disabled={!hasContent}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-200 ${effectiveView === 'toc'
                                ? 'bg-white text-gray-800 shadow-sm'
                                : hasContent
                                    ? 'text-gray-500 hover:text-gray-700'
                                    : 'text-gray-300 cursor-not-allowed'
                            }`}
                        title={hasContent ? 'Table of Contents' : 'Abra uma nota markdown para ver o sumário'}
                    >
                        <i className="fa-solid fa-list-ol text-[10px]"></i>
                        <span>Sumário</span>
                    </button>
                </div>
            </div>

            {/* Conditional rendering based on active view */}
            {effectiveView === 'files' ? (
                <>
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
                        showFavorites={showFavorites}
                        onToggleFavorites={onToggleFavoritesView}
                    />

                    {/* File Tree */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredFiles.length > 0 ? (
                            <FileTree
                                nodes={filteredFiles}
                                onSelectFile={onSelectFile}
                                onToggleFolder={onToggleFolder}
                                selectedIds={selectedIds}
                                onSelectionChange={onSelectionChange}
                                onGenerateRoteiro={onGenerateRoteiro}
                                onDeleteItems={onDeleteItems}
                                onMoveItems={onMoveItems}
                                onGroupInFolder={onGroupInFolder}
                                favorites={favorites}
                                onToggleFavorite={onToggleFavorite}
                                onRenameItem={onRenameItem}
                                onCreateNote={onCreateNote}
                            />
                        ) : (
                            <div className="p-4 text-center text-gray-400 text-xs mt-4">
                                No documents found.
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* Table of Contents View */
                <div className="flex-1 overflow-y-auto">
                    {activeNoteContent && (
                        <TableOfContents content={activeNoteContent} />
                    )}
                </div>
            )}

            {/* Settings Button - Bottom of Sidebar */}
            <div className="border-t border-gray-200 p-2 flex-shrink-0">
                <button
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md transition-colors text-sm"
                    title="Settings"
                >
                    <i className="fa-solid fa-gear"></i>
                    <span>Settings</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
