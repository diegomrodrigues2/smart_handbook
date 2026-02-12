
import { GoogleGenAI } from "@google/genai";
import { SubjectMode, Concept, ConceptSuggestion } from "../types";
import { getConceptExtractionPrompt, getConceptDefinitionPrompt } from "./prompts";
import { arrayBufferToBase64 } from "./pdfContentService";
import { getClient, getSelectedModel, subscribe, resetClient } from "./settingsService";

// Subscribe to settings changes to reset client when needed
subscribe(() => {
    resetClient();
});

// Result type for extraction — suggestions are per-concept
export interface ExtractionResult {
    concepts: (Concept & { suggestions: ConceptSuggestion[] })[];
}

// Schema for structured output for extraction (suggestions nested per concept)
const conceptListSchema = {
    type: "object" as const,
    properties: {
        concepts: {
            type: "array" as const,
            items: {
                type: "object" as const,
                properties: {
                    id: { type: "string" as const },
                    title: { type: "string" as const },
                    description: { type: "string" as const },
                    dependencies: {
                        type: "array" as const,
                        items: { type: "string" as const }
                    },
                    suggestions: {
                        type: "array" as const,
                        items: {
                            type: "object" as const,
                            properties: {
                                id: { type: "string" as const },
                                title: { type: "string" as const },
                                description: { type: "string" as const },
                                sectionType: { type: "string" as const }
                            },
                            required: ["id", "title", "description", "sectionType"]
                        }
                    }
                },
                required: ["id", "title", "description", "dependencies", "suggestions"]
            }
        }
    },
    required: ["concepts"]
};

/**
 * Extracts concepts and per-concept section suggestions from the provided content (text or PDF).
 */
export async function extractConcepts(
    noteContent: string,
    mode: SubjectMode,
    pdfData?: ArrayBuffer
): Promise<ExtractionResult | null> {
    try {
        const client = getClient();
        if (!client) {
            console.error("Gemini API client not initialized");
            return null;
        }

        const promptTemplate = getConceptExtractionPrompt(mode);
        // Add instruction to also extract per-concept suggestions
        const suggestionsInstruction = `\n\nPara CADA conceito extraído, inclua também um campo "suggestions" — uma lista de seções que enriqueceriam a definição desse conceito específico. Cada sugestão deve ter: id (string), title (nome da seção), description (breve descrição do que a seção conterá), sectionType (um de: 'tradeoffs', 'code-example', 'diagram', 'implementation-guide', 'deep-dive', 'use-cases', 'comparison'). As sugestões devem ser específicas e relevantes para o conceito em questão.`;
        const promptWithSuggestions = promptTemplate + suggestionsInstruction;
        // If it's just text, append it. If PDF, the model sees it as attachment.
        const effectivePrompt = pdfData ? promptWithSuggestions : promptWithSuggestions + "\n\n" + noteContent;

        const contentParts: any[] = [];

        if (pdfData) {
            console.log('[ConceptExtraction] Using PDF data for generation, size:', pdfData.byteLength);

            const pdfPart = {
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            };
            const textPart = { text: effectivePrompt };

            contentParts.push(pdfPart);
            contentParts.push(textPart);
        } else {
            contentParts.push({ text: effectivePrompt });
        }

        const response = await client.models.generateContent({
            model: getSelectedModel(),
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: conceptListSchema
            }
        });

        const text = response.text || '';
        if (!text) return null;

        const parsed = JSON.parse(text);

        if (!parsed.concepts || !Array.isArray(parsed.concepts)) {
            return null;
        }

        const concepts = parsed.concepts.map((c: any) => ({
            id: c.id,
            name: c.title,
            shortDefinition: c.description,
            fileName: serializeFilename(c.title),
            status: 'pending' as const,
            suggestions: (c.suggestions || []).map((s: any) => ({
                id: s.id,
                title: s.title,
                description: s.description,
                sectionType: s.sectionType
            }))
        }));

        return { concepts };

    } catch (error) {
        console.error("Error extracting concepts:", error);
        return null;
    }
}

/**
 * Generates the full markdown definition for a concept.
 */
export async function generateConceptDefinition(
    concept: Concept,
    contextContent: string,
    mode: SubjectMode,
    pdfData?: ArrayBuffer,
    onChunk?: (text: string) => void
): Promise<string> {
    try {
        const client = getClient();
        if (!client) throw new Error("API Client not ready");

        const prompt = getConceptDefinitionPrompt(mode, concept.name);

        const contentParts: any[] = [];
        if (pdfData) {
            console.log('[GenerateDefinition] Using PDF data for definition, size:', pdfData.byteLength);
            contentParts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
            contentParts.push({ text: prompt });
        } else {
            // Include context for better definitions
            contentParts.push({ text: prompt + "\n\nCONTEXTO ORIGINAL:\n" + contextContent.substring(0, 10000) });
        }

        const responseStream = await client.models.generateContentStream({
            model: getSelectedModel(),
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.7
            }
        });

        let fullText = "";
        for await (const chunk of responseStream) {
            const text = chunk.text || '';
            if (text) {
                fullText += text;
                if (onChunk) onChunk(text);
            }
        }
        return fullText;

    } catch (error) {
        console.error("Error generating definition:", error);
        throw error;
    }
}

/**
 * Utility to create a safe filename from a concept title.
 */
function serializeFilename(title: string): string {
    return title
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, "_") // Replace non-alphanumeric with underscore
        .replace(/_+/g, "_") // Remove duplicate underscores
        .replace(/^_|_$/g, "") + ".md"; // Trim underscores and add extension
}

/**
 * Saves the definition file to the file system.
 * It looks for (or creates) a 'definicoes' folder in the GRANDPARENT directory of the source file.
 * Example: if file is at "Root/Topic/pesquisas/file.pdf", saves to "Root/Topic/definicoes/"
 */
export async function saveDefinitionFile(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFileId: string, // Full path of the source file (e.g., "Folder/Subfolder/pesquisas/file.md")
    filename: string,
    content: string
): Promise<boolean> {
    try {
        // 1. Resolve the path to the source file
        const parts = sourceFileId.split('/');
        parts.pop(); // Remove filename -> ["Root", "Topic", "pesquisas"]

        // The first part is the root folder name, which directoryHandle already represents
        // So we skip it (start from index 1)
        let pathSegments = parts.slice(1); // Skip root folder -> ["Topic", "pesquisas"]

        // Go up one level (remove last segment) to get to grandparent
        if (pathSegments.length > 0) {
            pathSegments.pop(); // -> ["Topic"]
        }

        // 2. Traverse to the grandparent directory
        let currentHandle = directoryHandle;
        for (const folderName of pathSegments) {
            if (!folderName) continue; // skip empty if any
            currentHandle = await currentHandle.getDirectoryHandle(folderName);
        }

        // 3. Get or Create 'definicoes' folder
        const definitionsHandle = await currentHandle.getDirectoryHandle('definicoes', { create: true });

        // 4. Create and write file
        const fileHandle = await definitionsHandle.getFileHandle(filename, { create: true });
        const writable = await (fileHandle as any).createWritable();
        await writable.write(content);
        await writable.close();

        return true;
    } catch (error) {
        console.error("Error saving definition file:", error);
        return false;
    }
}
