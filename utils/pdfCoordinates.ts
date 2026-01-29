import type { PageViewport } from 'pdfjs-dist';

export interface NormalizedRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Converte coordenadas de tela (DOMRect) para coordenadas normalizadas (0-1)
 * Coordenadas normalizadas são independentes de zoom e rotação
 */
export function screenToNormalized(
    rect: DOMRect,
    viewport: PageViewport,
    containerRect: DOMRect
): NormalizedRect {
    // Ajustar para coordenadas relativas ao container
    const relativeX = rect.left - containerRect.left;
    const relativeY = rect.top - containerRect.top;

    // Normalizar em relação ao tamanho da página (viewport)
    const normalized: NormalizedRect = {
        x: relativeX / viewport.width,
        y: relativeY / viewport.height,
        width: rect.width / viewport.width,
        height: rect.height / viewport.height,
    };

    return normalized;
}

/**
 * Converte coordenadas normalizadas (0-1) para coordenadas de tela (DOMRect)
 * Usado para renderizar highlights na posição correta considerando zoom/rotação
 */
export function normalizedToScreen(
    rect: NormalizedRect,
    viewport: PageViewport
): { left: number; top: number; width: number; height: number } {
    return {
        left: rect.x * viewport.width,
        top: rect.y * viewport.height,
        width: rect.width * viewport.width,
        height: rect.height * viewport.height,
    };
}

/**
 * Extrai todos os retângulos de uma seleção de texto
 * Retorna array de ClientRects que cobrem o texto selecionado
 */
export function getTextRects(selection: Selection): DOMRect[] {
    if (!selection.rangeCount) return [];

    const range = selection.getRangeAt(0);
    const rects = Array.from(range.getClientRects());

    // Filtrar retângulos muito pequenos (artefatos)
    return rects.filter((rect) => rect.width > 1 && rect.height > 1);
}

/**
 * Gera um ID único para highlight
 */
export function generateHighlightId(): string {
    return `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calcula a cor de overlay com transparência para highlight
 */
export function getHighlightOverlayColor(baseColor: string, opacity: number = 0.3): string {
    // Se já tiver alpha, retorna como está
    if (baseColor.startsWith('rgba')) return baseColor;

    // Converte hex para rgba
    if (baseColor.startsWith('#')) {
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    return baseColor;
}
