import type { PDFMetadata, PDFHighlight } from '../types';

/**
 * Carrega metadados de anotações PDF de um arquivo metadata.json
 */
export async function loadMetadata(
    directoryHandle: FileSystemDirectoryHandle,
    pdfFileName: string
): Promise<PDFMetadata | null> {
    try {
        // Gera nome do arquivo de metadata baseado no PDF
        const metadataFileName = pdfFileName.replace('.pdf', '_metadata.json');

        // Busca o arquivo de metadata no mesmo diretório
        const metadataFileHandle = await directoryHandle.getFileHandle(metadataFileName);
        const file = await metadataFileHandle.getFile();
        const text = await file.text();

        const data = JSON.parse(text);

        // Converte strings de data para objetos Date
        return {
            ...data,
            highlights: data.highlights.map((h: any) => ({
                ...h,
                createdAt: new Date(h.createdAt),
                updatedAt: h.updatedAt ? new Date(h.updatedAt) : undefined,
            })),
            lastModified: new Date(data.lastModified),
        };
    } catch (error) {
        // Arquivo não existe ou erro de leitura
        console.log(`No metadata found for ${pdfFileName}:`, error);
        return null;
    }
}

/**
 * Salva metadados de anotações PDF em um arquivo metadata.json
 */
export async function saveMetadata(
    directoryHandle: FileSystemDirectoryHandle,
    pdfFileName: string,
    metadata: PDFMetadata
): Promise<void> {
    try {
        // Gera nome do arquivo de metadata baseado no PDF
        const metadataFileName = pdfFileName.replace('.pdf', '_metadata.json');

        // Atualiza lastModified
        const updatedMetadata: PDFMetadata = {
            ...metadata,
            lastModified: new Date(),
        };

        // Cria ou sobrescreve o arquivo
        const metadataFileHandle = await directoryHandle.getFileHandle(metadataFileName, {
            create: true,
        });

        const writable = await metadataFileHandle.createWritable();
        await writable.write(JSON.stringify(updatedMetadata, null, 2));
        await writable.close();

        console.log(`Metadata saved for ${pdfFileName}`);
    } catch (error) {
        console.error(`Failed to save metadata for ${pdfFileName}:`, error);
        throw error;
    }
}

/**
 * Cria um objeto PDFMetadata vazio para um novo PDF
 */
export function createEmptyMetadata(pdfPath: string): PDFMetadata {
    return {
        pdfPath,
        highlights: [],
        lastModified: new Date(),
    };
}

/**
 * Adiciona um highlight aos metadados
 */
export function addHighlight(
    metadata: PDFMetadata,
    highlight: PDFHighlight
): PDFMetadata {
    return {
        ...metadata,
        highlights: [...metadata.highlights, highlight],
        lastModified: new Date(),
    };
}

/**
 * Remove um highlight dos metadados
 */
export function removeHighlight(
    metadata: PDFMetadata,
    highlightId: string
): PDFMetadata {
    return {
        ...metadata,
        highlights: metadata.highlights.filter((h) => h.id !== highlightId),
        lastModified: new Date(),
    };
}

/**
 * Atualiza um highlight existente
 */
export function updateHighlight(
    metadata: PDFMetadata,
    highlightId: string,
    updates: Partial<PDFHighlight>
): PDFMetadata {
    return {
        ...metadata,
        highlights: metadata.highlights.map((h) =>
            h.id === highlightId
                ? { ...h, ...updates, updatedAt: new Date() }
                : h
        ),
        lastModified: new Date(),
    };
}

/**
 * Obtém highlights de uma página específica
 */
export function getHighlightsForPage(
    metadata: PDFMetadata,
    pageNumber: number
): PDFHighlight[] {
    return metadata.highlights.filter((h) => h.pageNumber === pageNumber);
}
