import React from 'react';

interface SidebarToolbarProps {
    onNewFile: () => void;
    onNewFolder: () => void;
    onLoadDirectory: () => void;
    onRefresh?: () => void;
    onCollapse: () => void;
    showRefresh: boolean;
}

const SidebarToolbar: React.FC<SidebarToolbarProps> = ({
    onNewFile,
    onNewFolder,
    onLoadDirectory,
    onRefresh,
    onCollapse,
    showRefresh
}) => {
    return (
        <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 text-gray-500 flex-shrink-0">
            <button
                onClick={onNewFile}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="New File"
            >
                <i className="fa-regular fa-file"></i>
            </button>
            <button
                onClick={onNewFolder}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="New Folder"
            >
                <i className="fa-regular fa-folder"></i>
            </button>
            <button
                onClick={onLoadDirectory}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors text-blue-600"
                title="Load Directory"
            >
                <i className="fa-solid fa-folder-plus"></i>
            </button>
            {showRefresh && onRefresh && (
                <button
                    onClick={onRefresh}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors text-green-600"
                    title="Refresh Tree"
                >
                    <i className="fa-solid fa-rotate"></i>
                </button>
            )}
            <div className="flex-1"></div>
            <button
                onClick={onCollapse}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title="Collapse Sidebar"
            >
                <i className="fa-solid fa-angles-left"></i>
            </button>
        </div>
    );
};

export default SidebarToolbar;
