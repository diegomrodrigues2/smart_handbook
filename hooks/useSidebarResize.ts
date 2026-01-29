import { useState, useCallback } from 'react';

interface UseSidebarResizeOptions {
    minWidth?: number;
    maxWidth?: number;
    initialWidth?: number;
}

interface UseSidebarResizeReturn {
    width: number;
    isResizing: boolean;
    startResizing: (e: React.MouseEvent) => void;
}

export const useSidebarResize = (options: UseSidebarResizeOptions = {}): UseSidebarResizeReturn => {
    const { minWidth = 256, maxWidth = 600, initialWidth = 256 } = options;

    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        setWidth(prev => {
            const newWidth = e.clientX;
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                return newWidth;
            }
            return prev;
        });
    }, [minWidth, maxWidth]);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.body.style.cursor = 'default';
    }, [handleMouseMove]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing, { once: true });
        document.body.style.cursor = 'col-resize';
    }, [handleMouseMove, stopResizing]);

    return { width, isResizing, startResizing };
};
