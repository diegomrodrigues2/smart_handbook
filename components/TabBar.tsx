import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Tab, StudyModeType } from '../types';

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string | null;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onTabDoubleClick: (tabId: string) => void;
}

// Get icon for file type or study mode
function getTabIcon(tab: Tab): string {
    if (tab.isStudyMode && tab.studyModeType) {
        const icons: Record<StudyModeType, string> = {
            learning: 'fa-graduation-cap',
            lesson: 'fa-chalkboard-teacher',
            workbook: 'fa-book',
            challenge: 'fa-trophy',
            interview: 'fa-comments',
            pairProgramming: 'fa-code',
            conceptExtraction: 'fa-lightbulb',
            excalidraw: 'fa-pencil',
            drawio: 'fa-diagram-project',
            projectSpec: 'fa-file-code'
        };
        return `fa-solid ${icons[tab.studyModeType]}`;
    }

    if (tab.fileType === 'pdf') {
        return 'fa-solid fa-file-pdf';
    }

    return 'fa-regular fa-file-lines';
}

// Get icon color for file type or study mode
function getTabIconColor(tab: Tab): string {
    if (tab.isStudyMode && tab.studyModeType) {
        const colors: Record<StudyModeType, string> = {
            learning: 'text-green-500',
            lesson: 'text-purple-500',
            workbook: 'text-orange-500',
            challenge: 'text-yellow-500',
            interview: 'text-blue-500',
            pairProgramming: 'text-cyan-500',
            conceptExtraction: 'text-pink-500',
            excalidraw: 'text-amber-500',
            drawio: 'text-indigo-500',
            projectSpec: 'text-sky-500'
        };
        return colors[tab.studyModeType];
    }

    if (tab.fileType === 'pdf') {
        return 'text-red-500';
    }

    return 'text-gray-400';
}

const TabBar: React.FC<TabBarProps> = ({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onTabDoubleClick
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftGradient, setShowLeftGradient] = useState(false);
    const [showRightGradient, setShowRightGradient] = useState(false);
    const scrollIntervalRef = useRef<number | null>(null);

    // Check if we need to show scroll gradients
    const updateGradients = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setShowLeftGradient(scrollLeft > 0);
        setShowRightGradient(scrollLeft + clientWidth < scrollWidth - 1);
    }, []);

    useEffect(() => {
        updateGradients();
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', updateGradients);
            const resizeObserver = new ResizeObserver(updateGradients);
            resizeObserver.observe(container);

            return () => {
                container.removeEventListener('scroll', updateGradients);
                resizeObserver.disconnect();
            };
        }
    }, [updateGradients, tabs]);

    // Start scrolling
    const startScroll = useCallback((direction: 'left' | 'right') => {
        const container = containerRef.current;
        if (!container) return;

        const scrollAmount = direction === 'left' ? -5 : 5;

        scrollIntervalRef.current = window.setInterval(() => {
            container.scrollLeft += scrollAmount;
        }, 16); // ~60fps
    }, []);

    // Stop scrolling
    const stopScroll = useCallback(() => {
        if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    }, []);

    // Handle tab close with middle click
    const handleMouseDown = useCallback((e: React.MouseEvent, tabId: string) => {
        if (e.button === 1) { // Middle click
            e.preventDefault();
            onTabClose(tabId);
        }
    }, [onTabClose]);

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div className="relative flex items-center bg-gray-100 border-b border-gray-200 min-h-[38px]">
            {/* Left scroll zone */}
            {showLeftGradient && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-gray-200 to-transparent cursor-pointer flex items-center justify-center"
                    onMouseEnter={() => startScroll('left')}
                    onMouseLeave={stopScroll}
                >
                    <i className="fa-solid fa-chevron-left text-gray-500 text-xs"></i>
                </div>
            )}

            {/* Tabs container */}
            <div
                ref={containerRef}
                className="flex-1 flex overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`
              group flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] 
              border-r border-gray-200 cursor-pointer select-none transition-colors
              ${activeTabId === tab.id
                                ? 'bg-white border-b-2 border-b-blue-500'
                                : 'bg-gray-50 hover:bg-gray-100'}
            `}
                        onClick={() => onTabClick(tab.id)}
                        onDoubleClick={() => onTabDoubleClick(tab.id)}
                        onMouseDown={(e) => handleMouseDown(e, tab.id)}
                    >
                        {/* Icon */}
                        <i className={`${getTabIcon(tab)} ${getTabIconColor(tab)} text-sm flex-shrink-0`}></i>

                        {/* Tab name */}
                        <span
                            className={`
                text-sm truncate flex-1
                ${!tab.isPinned && !tab.isStudyMode ? 'italic text-gray-500' : 'text-gray-700'}
              `}
                            title={tab.name}
                        >
                            {tab.name}
                        </span>

                        {/* Close button */}
                        <button
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                            }}
                        >
                            <i className="fa-solid fa-times text-gray-400 hover:text-gray-600 text-xs"></i>
                        </button>
                    </div>
                ))}
            </div>

            {/* Right scroll zone */}
            {showRightGradient && (
                <div
                    className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-gray-200 to-transparent cursor-pointer flex items-center justify-center"
                    onMouseEnter={() => startScroll('right')}
                    onMouseLeave={stopScroll}
                >
                    <i className="fa-solid fa-chevron-right text-gray-500 text-xs"></i>
                </div>
            )}
        </div>
    );
};

export default TabBar;
