// ============================================================================
// PROJECT SPECIFICATION SERVICE
// Service for generating and managing project specifications
// ============================================================================

import { GoogleGenAI } from "@google/genai";
import {
    ProjectSpecSession,
    SubjectMode,
    ProjectSpecType,
    ProjectChallenge
} from "../types";
import { getProjectChallengeGenerationPrompt, getChallengeBasedSpecPrompt } from "./prompts";
import { arrayBufferToBase64 } from "./pdfContentService";
import { getClient, getSelectedModel, subscribe, resetClient } from "./settingsService";

// Subscribe to settings changes to reset client when needed
subscribe(() => {
    resetClient();
});




/**
 * Generates project challenges based on note/PDF content
 */
export async function generateProjectChallenges(
    noteContent: string,
    mode: SubjectMode,
    pdfData?: ArrayBuffer
): Promise<ProjectChallenge[]> {
    const client = getClient();
    const prompt = getProjectChallengeGenerationPrompt(noteContent, mode);

    const contents: any[] = [];

    if (pdfData) {
        const base64Pdf = arrayBufferToBase64(pdfData);
        contents.push({
            role: 'user',
            parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
                { text: prompt }
            ]
        });
    } else {
        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });
    }

    try {
        const response = await client.models.generateContent({
            model: getSelectedModel(),
            contents,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        challenges: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    title: { type: 'string' },
                                    type: { type: 'string', enum: ['System Design', 'Low Level Design'] },
                                    description: { type: 'string' },
                                    ambiguousPrompt: { type: 'string' }
                                },
                                required: ['id', 'title', 'type', 'description', 'ambiguousPrompt']
                            }
                        }
                    },
                    required: ['challenges']
                }
            }
        });

        const parsed = JSON.parse(response.text || '{}');
        return (parsed.challenges || []).map((c: any, idx: number) => ({
            id: c.id || `challenge_${idx}`,
            title: c.title || '',
            type: c.type || 'System Design',
            description: c.description || '',
            ambiguousPrompt: c.ambiguousPrompt || ''
        }));
    } catch (error) {
        console.error('Error generating project challenges:', error);
        return [];
    }
}




/**
 * Generates a complete project description based on the selected challenge
 */
export async function generateConciseSpec(
    noteContent: string,
    specType: ProjectSpecType,
    challenge: ProjectChallenge,
    pdfData?: ArrayBuffer
): Promise<string> {
    const client = getClient();

    // Build challenge context
    const challengeContext = `Título: ${challenge.title}
Tipo: ${challenge.type}
Descrição: ${challenge.description}
Prompt: ${challenge.ambiguousPrompt}`;

    const prompt = getChallengeBasedSpecPrompt(
        noteContent,
        specType,
        challengeContext,
        '' // solutionOptions removed
    );

    const contents: any[] = [];

    if (pdfData) {
        const base64Pdf = arrayBufferToBase64(pdfData);
        contents.push({
            role: 'user',
            parts: [
                { inlineData: { mimeType: 'application/pdf', data: base64Pdf } },
                { text: prompt }
            ]
        });
    } else {
        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });
    }

    try {
        const response = await client.models.generateContent({
            model: getSelectedModel(),
            contents
        });

        return response.text || '';
    } catch (error) {
        console.error('Error generating concise spec:', error);
        throw error;
    }
}



/**
 * Helper to sanitize filename
 */
const sanitizeFileName = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 40);
};

/**
 * Helper to get parent folder path from noteId
 */
const getParentFolderPath = (noteId: string): string[] => {
    const parts = noteId.split(/[\\/]/);
    if (parts.length >= 3) {
        return parts.slice(1, -2);
    }
    return parts.slice(1, -1);
};

/**
 * Saves the specification to a markdown file in the 'projetos' folder
 */
export async function saveSpecification(
    session: ProjectSpecSession,
    specContent: string,
    directoryHandle: FileSystemDirectoryHandle | null
): Promise<{ success: boolean; fileName: string; message: string }> {
    if (!directoryHandle) {
        return { success: false, fileName: '', message: 'Nenhum diretório carregado.' };
    }

    try {
        // Navigate to parent folder
        const parentPath = getParentFolderPath(session.noteId);
        let currentHandle = directoryHandle;

        for (const folderName of parentPath) {
            if (!folderName) continue;
            currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
        }

        // Create or get 'projetos' folder
        const projetosHandle = await currentHandle.getDirectoryHandle('projetos', { create: true });

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const safeTitle = sanitizeFileName(session.noteName);
        const fileName = `projeto_${safeTitle}_${timestamp}.md`;

        // Create file
        const fileHandle = await projetosHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();

        // Add header with metadata
        const fullContent = `${specContent}`;

        await writable.write(fullContent);
        await writable.close();

        return {
            success: true,
            fileName,
            message: `Especificação salva com sucesso como ${fileName} na pasta 'projetos'!`
        };
    } catch (error: any) {
        console.error('Error saving specification:', error);
        return {
            success: false,
            fileName: '',
            message: `Erro ao salvar especificação: ${error.message || 'Erro desconhecido'}`
        };
    }
}


