import { useState, useCallback } from 'react';

interface UseChatResizeOptions {
    minWidth?: number;
    maxWidth?: number;
    initialWidth?: number;
}

interface UseChatResizeReturn {
    width: number;
    isResizing: boolean;
    startResizing: (e: React.MouseEvent) => void;
}

export const useChatResize = (options: UseChatResizeOptions = {}): UseChatResizeReturn => {
    const { minWidth = 320, maxWidth = 700, initialWidth = 400 } = options;

    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        setWidth(prev => {
            // Chat is on the right side, so we calculate from the right edge of the window
            const newWidth = window.innerWidth - e.clientX;
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
