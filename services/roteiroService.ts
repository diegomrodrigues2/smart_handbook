/**
 * Service for generating study scripts (roteiros de estudos) from folder notes.
 */

import { GoogleGenAI } from "@google/genai";
import { getStudyScriptPrompt, getStudyScriptSystemPrompt } from "./prompts/roteiroPrompts";
import { getClient, getSelectedModel, subscribe, resetClient } from "./settingsService";

// Subscribe to settings changes to reset client when needed
subscribe(() => {
    resetClient();
});

// Special folders that should be "skipped" when determining roteiro save location
const SPECIAL_FOLDERS = ['definicoes', 'pesquisas', 'exemplos', 'exercicios'];

export interface RoteiroGenerationResult {
    success: boolean;
    message: string;
    filePath?: string;
}

/**
 * Determines the correct save location for the roteiro.
 * If the folder is inside a special folder (definicoes, pesquisas, etc.),
 * we need to go up to the parent topic level.
 * 
 * @param folderPath - The path of the clicked folder (e.g., "root/Topic/definicoes/subtopic")
 * @returns The path where "roteiros" folder should be created
 */
function resolveSaveLocation(folderPath: string): string {
    const parts = folderPath.split('/').filter(p => p.length > 0);

    // Find if any part is a special folder
    let specialFolderIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
        if (SPECIAL_FOLDERS.includes(parts[i].toLowerCase())) {
            specialFolderIndex = i;
            break;
        }
    }

    if (specialFolderIndex > 0) {
        // Return path up to (but not including) the special folder
        return parts.slice(0, specialFolderIndex).join('/');
    }

    // No special folder found, use the folder itself
    return folderPath;
}

/**
 * Recursively collects all markdown file contents from node IDs.
 */
async function collectNotesFromNodes(
    directoryHandle: FileSystemDirectoryHandle,
    nodeIds: string[]
): Promise<{ fileName: string; content: string; relativePath: string }[]> {
    const allNotes: { fileName: string; content: string; relativePath: string }[] = [];

    for (const nodeId of nodeIds) {
        try {
            const parts = nodeId.split('/');
            const pathSegments = parts.slice(1);

            let currentHandle: FileSystemHandle = directoryHandle;
            for (const segment of pathSegments) {
                if (!segment) continue;
                if ((currentHandle as any).getDirectoryHandle) {
                    currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(segment);
                } else {
                    break;
                }
            }

            if (currentHandle.kind === 'file' && (currentHandle.name.endsWith('.md') || currentHandle.name.toLowerCase().endsWith('.pdf'))) {
                const file = await (currentHandle as FileSystemFileHandle).getFile();
                let content = "";
                if (currentHandle.name.endsWith('.md')) {
                    content = await file.text();
                } else {
                    const buffer = await file.arrayBuffer();
                    content = await extractTextFromPDF(buffer, 2);
                }
                allNotes.push({
                    fileName: currentHandle.name,
                    content,
                    relativePath: nodeId
                });
            } else if (currentHandle.kind === 'directory') {
                await collectNotesRecursive(currentHandle as FileSystemDirectoryHandle, pathSegments, allNotes);
            }
        } catch (error) {
            console.error(`Error collecting notes for ${nodeId}:`, error);
        }
    }

    return allNotes;
}

import { pdfjs } from 'react-pdf';

// Ensure worker is configured
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extracts text from the first few pages of a PDF.
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer, maxPages: number = 2): Promise<string> {
    try {
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";

        const numPagesToProcess = Math.min(pdf.numPages, maxPages);

        for (let i = 1; i <= numPagesToProcess; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .filter((item: any) => item.str)
                .map((item: any) => item.str)
                .join(' ');
            fullText += `--- Página ${i} ---\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        return "Erro ao ler conteúdo do PDF.";
    }
}

async function collectNotesRecursive(
    handle: FileSystemDirectoryHandle,
    currentPath: string[],
    notes: { fileName: string; content: string; relativePath: string }[]
): Promise<void> {
    for await (const entry of (handle as any).values()) {
        const isMarkdown = entry.kind === 'file' && entry.name.endsWith('.md');
        const isPDF = entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf');

        if (isMarkdown || isPDF) {
            try {
                const file = await entry.getFile();
                let content = "";

                if (isMarkdown) {
                    content = await file.text();
                } else if (isPDF) {
                    const buffer = await file.arrayBuffer();
                    content = await extractTextFromPDF(buffer, 2);
                }

                const relativePath = [...currentPath, entry.name].join('/');
                notes.push({
                    fileName: entry.name,
                    content,
                    relativePath
                });
            } catch (e) {
                console.error(`Error reading file ${entry.name}:`, e);
            }
        } else if (entry.kind === 'directory' && entry.name !== 'roteiros') {
            // Recurse into subdirectories (except roteiros itself)
            await collectNotesRecursive(
                entry,
                [...currentPath, entry.name],
                notes
            );
        }
    }
}

// Schema for structured output
const roteiroSchema = {
    type: "object" as const,
    properties: {
        roteiroContent: {
            type: "string" as const,
            description: "The full markdown content of the study script, following the requested format."
        },
        suggestedFilename: {
            type: "string" as const,
            description: "A relevant filename using snake_case, ending in .md, e.g., 'guia_estudos_aws.md'. Do NOT use 'roteiro_de_estudos.md'."
        }
    },
    required: ["roteiroContent", "suggestedFilename"]
};

/**
 * Generates a study script using Gemini API.
 */
async function generateRoteiroContent(
    folderName: string,
    notes: { fileName: string; content: string; relativePath: string }[],
    onProgress?: (message: string) => void
): Promise<{ content: string; filename: string }> {
    const ai = getClient();
    if (!ai) {
        throw new Error("API Client not initialized");
    }

    onProgress?.("Preparando conteúdo para análise...");

    // Build the content to send - limit to first 3000 chars per file (approx 2 pages) to save tokens
    const notesContent = notes.map(note =>
        `## Arquivo: ${note.relativePath}\n\n${note.content.substring(0, 3000)}...`
    ).join('\n\n---\n\n');

    const prompt = getStudyScriptPrompt(folderName) + notesContent;
    const systemPrompt = getStudyScriptSystemPrompt();

    onProgress?.("Gerando roteiro de estudos com IA...");

    try {
        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n' + prompt }] }
            ],
            config: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: roteiroSchema
            }
        });

        const text = response.text || '';
        if (!text) throw new Error("Empty response from AI");

        const parsed = JSON.parse(text);
        return {
            content: parsed.roteiroContent,
            filename: parsed.suggestedFilename
        };

    } catch (error) {
        console.error("Error generating roteiro:", error);
        throw error;
    }
}

/**
 * Main function to generate and save a study script for multiple items.
 */
export async function generateStudyScript(
    nodeIds: string[],
    directoryHandle: FileSystemDirectoryHandle,
    onProgress?: (message: string) => void
): Promise<RoteiroGenerationResult> {
    try {
        if (nodeIds.length === 0) {
            return { success: false, message: "Nenhum item selecionado." };
        }

        onProgress?.("Coletando notas dos itens selecionados...");

        // Collect all notes from the clicked items
        const notes = await collectNotesFromNodes(directoryHandle, nodeIds);

        if (notes.length === 0) {
            return {
                success: false,
                message: "Nenhuma nota markdown ou PDF encontrada nos itens selecionados."
            };
        }

        // Use the first item's name or a generic name for the title
        const firstNodeParts = nodeIds[0].split('/');
        const firstNodeName = firstNodeParts[firstNodeParts.length - 1];
        const displayTitle = nodeIds.length > 1 ? `${firstNodeName} and others` : firstNodeName;

        onProgress?.(`Encontradas ${notes.length} notas. Gerando roteiro...`);

        // Generate the roteiro content
        const result = await generateRoteiroContent(displayTitle, notes, onProgress);

        if (!result || !result.content) {
            return {
                success: false,
                message: "Erro ao gerar conteúdo do roteiro."
            };
        }

        onProgress?.(`Salvando roteiro como ${result.filename}...`);

        // Determine where to save the roteiro (use the first item's parent topic)
        const saveLocationPath = resolveSaveLocation(nodeIds[0]);
        const saveSegments = saveLocationPath.split('/').slice(1); // Skip root

        // Navigate to save location and create/get roteiros folder
        let currentHandle = directoryHandle;
        for (const segment of saveSegments) {
            if (!segment) continue;
            currentHandle = await currentHandle.getDirectoryHandle(segment);
        }

        // Create/get the roteiros folder
        const roteirosHandle = await currentHandle.getDirectoryHandle('roteiros', { create: true });

        // Create the file with suggested filename
        // Ensure filename ends with .md and sanitize simplified
        let safeFilename = result.filename.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
        if (!safeFilename.endsWith('.md')) safeFilename += '.md';

        const fileHandle = await roteirosHandle.getFileHandle(safeFilename, { create: true });
        const writable = await (fileHandle as any).createWritable();
        await writable.write(result.content);
        await writable.close();

        const savedPath = `${saveLocationPath}/roteiros/${safeFilename}`;

        return {
            success: true,
            message: `Roteiro gerado com sucesso em: ${savedPath}`,
            filePath: savedPath
        };

    } catch (error: any) {
        console.error("Error in generateStudyScript:", error);
        return {
            success: false,
            message: `Erro ao gerar roteiro: ${error.message || 'Erro desconhecido'}`
        };
    }
}
