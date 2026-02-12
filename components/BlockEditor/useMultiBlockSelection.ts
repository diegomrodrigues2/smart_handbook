import { useState, useCallback, useEffect, useRef } from 'react';

export interface MultiBlockSelection {
    startIndex: number;
    endIndex: number;
}

/**
 * Hook for drag-to-select multi-block selection.
 * 
 * - On mousedown on a block, record the potential drag start (no selection yet).
 * - On mousemove, if the mouse crosses into a DIFFERENT block, immediately
 *   clear the native text selection, disable user-select on the container,
 *   and activate multi-block selection mode.
 * - On mouseup, if we never crossed blocks, it was just a click (no selection).
 */
export function useMultiBlockSelection(containerRef: React.RefObject<HTMLDivElement | null>) {
    const [selection, setSelection] = useState<MultiBlockSelection | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartIndex = useRef<number | null>(null);
    const isMouseDown = useRef(false);
    const activated = useRef(false); // has the drag crossed block boundaries?

    const getBlockIndexFromEvent = useCallback((e: MouseEvent | React.MouseEvent): number | null => {
        const target = e.target as HTMLElement;
        const blockEl = target.closest('[data-block-index]') as HTMLElement | null;
        if (!blockEl) return null;
        const idx = parseInt(blockEl.getAttribute('data-block-index') || '', 10);
        return isNaN(idx) ? null : idx;
    }, []);

    // Suppress native text selection while cross-block dragging
    const suppressNativeSelection = useCallback(() => {
        window.getSelection()?.removeAllRanges();
        if (containerRef.current) {
            containerRef.current.style.userSelect = 'none';
            containerRef.current.style.webkitUserSelect = 'none';
        }
    }, [containerRef]);

    const restoreNativeSelection = useCallback(() => {
        if (containerRef.current) {
            containerRef.current.style.userSelect = '';
            containerRef.current.style.webkitUserSelect = '';
        }
    }, [containerRef]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, a, textarea, input, .block-edit-textarea')) return;

        const idx = getBlockIndexFromEvent(e);
        if (idx === null) return;

        // If there is already a selection and the click is inside it, don't clear.
        // If the click is outside the selection container (toolbar etc), let it be.

        isMouseDown.current = true;
        activated.current = false;
        dragStartIndex.current = idx;
    }, [getBlockIndexFromEvent]);

    // Global mousemove — detect cross-block drag
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isMouseDown.current || dragStartIndex.current === null) return;

            const target = e.target as HTMLElement;
            const blockEl = target.closest('[data-block-index]') as HTMLElement | null;
            if (!blockEl) return;
            const idx = parseInt(blockEl.getAttribute('data-block-index') || '', 10);
            if (isNaN(idx)) return;

            if (idx !== dragStartIndex.current || activated.current) {
                if (!activated.current) {
                    // First time crossing into a different block — suppress native selection
                    activated.current = true;
                    suppressNativeSelection();
                    setIsDragging(true);
                }
                // Keep clearing native selection as we drag
                window.getSelection()?.removeAllRanges();

                setSelection({
                    startIndex: dragStartIndex.current,
                    endIndex: idx,
                });
            }
        };

        const onUp = () => {
            if (isMouseDown.current) {
                isMouseDown.current = false;
                if (activated.current) {
                    restoreNativeSelection();
                }
                activated.current = false;
                setIsDragging(false);
                dragStartIndex.current = null;
            }
        };

        document.addEventListener('mousemove', onMove, true);
        document.addEventListener('mouseup', onUp, true);

        return () => {
            document.removeEventListener('mousemove', onMove, true);
            document.removeEventListener('mouseup', onUp, true);
        };
    }, [suppressNativeSelection, restoreNativeSelection]);

    const clearSelection = useCallback(() => {
        setSelection(null);
        setIsDragging(false);
        isMouseDown.current = false;
        activated.current = false;
        dragStartIndex.current = null;
        restoreNativeSelection();
    }, [restoreNativeSelection]);

    // Normalized range (min/max)
    const selectedRange: { from: number; to: number } | null = selection
        ? {
            from: Math.min(selection.startIndex, selection.endIndex),
            to: Math.max(selection.startIndex, selection.endIndex),
        }
        : null;

    const isBlockSelected = useCallback((index: number): boolean => {
        if (!selectedRange) return false;
        return index >= selectedRange.from && index <= selectedRange.to;
    }, [selectedRange]);

    const selectedCount = selectedRange ? selectedRange.to - selectedRange.from + 1 : 0;

    // Escape key to clear selection
    useEffect(() => {
        if (!selection) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selection, clearSelection]);

    // Click outside container to clear selection
    useEffect(() => {
        if (!selection) return;

        const handleClickOutside = (e: MouseEvent) => {
            // Don't clear if clicking inside toolbar or container
            const target = e.target as HTMLElement;
            if (target.closest('[data-multi-toolbar]')) return;
            if (containerRef.current && !containerRef.current.contains(target)) {
                clearSelection();
            }
        };

        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selection, clearSelection, containerRef]);

    return {
        selection,
        selectedRange,
        selectedCount,
        isDragging,
        isBlockSelected,
        clearSelection,
        handleMouseDown,
    };
}
