import { GoogleGenAI } from "@google/genai";
import { Challenge, ChallengeSession, ChallengeMessage, SubjectMode } from "../types";
import {
    getChallengeGenerationPrompt,
    getChallengeInterviewPrompt,
    getChallengeHintPrompt,
    getChallengeSolutionPrompt,
    getChallengeSavePrompt,
    getCustomChallengeGenerationPrompt
} from "./prompts";

const apiKey = process.env.API_KEY || '';

let client: GoogleGenAI | null = null;

const getClient = () => {
    if (!client && apiKey) {
        client = new GoogleGenAI({ apiKey });
    }
    return client;
};

const MODEL_ID = "gemini-3-pro-preview";

import { arrayBufferToBase64 } from "./pdfContentService";

export const generateChallengeAlternatives = async (
    noteContent: string,
    pdfData?: ArrayBuffer,
    mode: SubjectMode = 'computing'
): Promise<Challenge[]> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return [];
    }

    try {
        const prompt = getChallengeGenerationPrompt(pdfData ? "[PDF ATTACHED]" : noteContent, mode);

        // Prepare content parts: PDF attachment if available, otherwise just text
        const contentParts: any[] = [];
        if (pdfData) {
            contentParts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
            contentParts.push({ text: prompt });
        } else {
            contentParts.push({ text: prompt });
        }

        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        challenges: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    type: { type: "string", enum: ["System Design", "Low Level Design"] },
                                    description: { type: "string" },
                                    ambiguousPrompt: { type: "string" }
                                },
                                required: ["id", "title", "type", "description", "ambiguousPrompt"]
                            }
                        }
                    },
                    required: ["challenges"]
                }
            }
        });

        const text = response.text || "";
        const parsed = JSON.parse(text);
        return parsed.challenges;
    } catch (error) {
        console.error("Error generating challenges:", error);
    }
    return [];
};

export const generateCustomChallenge = async (
    userSuggestion: string,
    noteContent: string,
    pdfData?: ArrayBuffer,
    mode: SubjectMode = 'computing'
): Promise<Challenge | null> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return null;
    }

    try {
        const prompt = getCustomChallengeGenerationPrompt(
            userSuggestion,
            pdfData ? "[PDF ATTACHED]" : noteContent,
            mode
        );

        // Prepare content parts: PDF attachment if available, otherwise just text
        const contentParts: any[] = [];
        if (pdfData) {
            contentParts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
            contentParts.push({ text: prompt });
        } else {
            contentParts.push({ text: prompt });
        }

        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        challenge: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                title: { type: "string" },
                                type: { type: "string", enum: ["System Design", "Low Level Design"] },
                                description: { type: "string" },
                                ambiguousPrompt: { type: "string" }
                            },
                            required: ["id", "title", "type", "description", "ambiguousPrompt"]
                        }
                    },
                    required: ["challenge"]
                }
            }
        });

        const text = response.text || "";
        const parsed = JSON.parse(text);
        return parsed.challenge;
    } catch (error) {
        console.error("Error generating custom challenge:", error);
    }
    return null;
};

export const startChallengeSession = async (
    noteId: string,
    noteName: string,
    noteContent: string,
    pdfData?: ArrayBuffer,
    mode: SubjectMode = 'computing'
): Promise<ChallengeSession | null> => {
    const alternatives = await generateChallengeAlternatives(noteContent, pdfData, mode);
    if (alternatives.length === 0) return null;

    return {
        noteId,
        noteName,
        mode,
        alternatives,
        selectedChallenge: null,
        messages: [],
        isComplete: false
    };
};

export const getInterviewResponse = async (
    session: ChallengeSession,
    researchContent: string,
    noteContent: string,
    onChunk: (text: string) => void,
    recentImage?: { mimeType: string, data: string },
    pdfData?: ArrayBuffer
): Promise<void> => {
    const ai = getClient();
    if (!ai || !session.selectedChallenge) {
        onChunk("Erro: Cliente de IA não disponível ou desafio não selecionado.");
        return;
    }

    const dialogHistoryText = session.messages
        .map(m => `${m.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${m.text}${m.imageUrl ? ' [Anexo de Imagem Enviado]' : ''}${m.audioUrl ? ' [Mensagem de Voz Enviada]' : ''}`)
        .join('\n');

    const prompt = getChallengeInterviewPrompt(
        session.selectedChallenge.type,
        session.selectedChallenge.title,
        session.selectedChallenge.ambiguousPrompt,
        researchContent,
        pdfData ? "[PDF ATTACHED]" : noteContent,
        dialogHistoryText || 'Início da entrevista',
        session.mode
    );

    try {
        const parts: any[] = [{ text: prompt }];
        if (recentImage) {
            parts.push({
                inlineData: {
                    mimeType: recentImage.mimeType,
                    data: recentImage.data
                }
            });
        }
        if (pdfData) {
            parts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
        }

        const responseStream = await ai.models.generateContentStream({
            model: MODEL_ID,
            contents: [{ role: 'user', parts }],
            config: { temperature: 0.7 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (error: any) {
        console.error("Error generating interview response:", error);
        onChunk(`[Erro: ${error.message || "Falha ao gerar resposta"}]`);
    }
};

export const requestHint = async (
    session: ChallengeSession,
    onChunk: (text: string) => void
): Promise<void> => {
    const ai = getClient();
    if (!ai || !session.selectedChallenge) return;

    const dialogHistoryText = session.messages
        .map(m => `${m.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${m.text}`)
        .join('\n');

    const prompt = getChallengeHintPrompt(session.selectedChallenge.title, dialogHistoryText, session.mode);

    try {
        const responseStream = await ai.models.generateContentStream({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.7 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) onChunk(chunk.text);
        }
    } catch (error) {
        console.error("Error requesting hint:", error);
    }
};

export const generateSolution = async (
    session: ChallengeSession,
    researchContent: string,
    noteContent: string,
    onChunk: (text: string) => void,
    pdfData?: ArrayBuffer
): Promise<string> => {
    const ai = getClient();
    if (!ai || !session.selectedChallenge) return "";

    const dialogHistoryText = session.messages
        .map(m => `${m.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${m.text}`)
        .join('\n');

    const prompt = getChallengeSolutionPrompt(
        session.selectedChallenge.type,
        session.selectedChallenge.title,
        researchContent,
        pdfData ? "[PDF ATTACHED]" : noteContent,
        dialogHistoryText,
        session.mode
    );

    let fullText = "";
    try {
        const parts: any[] = [{ text: prompt }];
        if (pdfData) {
            parts.push({
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            });
        }

        const responseStream = await ai.models.generateContentStream({
            model: MODEL_ID,
            contents: [{ role: 'user', parts }],
            config: { temperature: 0.7 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                fullText += chunk.text;
                onChunk(chunk.text);
            }
        }
    } catch (error) {
        console.error("Error generating solution:", error);
    }
    return fullText;
};

export const summarizeInterview = async (
    session: ChallengeSession,
): Promise<string> => {
    const ai = getClient();
    if (!ai) return "";

    const dialogHistoryText = session.messages
        .map(m => `${m.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}: ${m.text}`)
        .join('\n');

    const prompt = getChallengeSavePrompt(dialogHistoryText, session.mode);

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: { temperature: 0.7 }
        });
        return response.text || "";
    } catch (error) {
        console.error("Error summarizing interview:", error);
        return "";
    }
};
