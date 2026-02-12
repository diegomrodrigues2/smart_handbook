import { GoogleGenAI } from "@google/genai";
import { LearningConcept, LearningMessage, LearningSession, SuggestedProblem, IntroductionContent, SubjectMode } from "../types";
import {
    getConceptExtractionPrompt,
    getSocraticTutorPrompt,
    getIntroductionPrompt,
    getStepByStepSolutionPrompt
} from "./prompts";
import { getClient, getSelectedModel, subscribe, resetClient } from "./settingsService";

// Subscribe to settings changes to reset client when needed
subscribe(() => {
    resetClient();
});

// ============================================================================
// RESPONSE EVALUATION PROMPT (same for all modes)
// ============================================================================

const RESPONSE_EVALUATION_PROMPT = `
Você é um avaliador pedagógico. Analise a resposta do estudante e determine:

1. COMPREENSÃO: O estudante demonstra compreensão do conceito? (0-100%)
2. AÇÃO: Qual deve ser a próxima ação?
   - "advance" = Avançar para próximo conceito (compreensão >= 80%)
   - "reinforce" = Reforçar o conceito atual (compreensão 50-79%)
   - "increase_support" = Aumentar nível de suporte (compreensão < 50%)
3. FEEDBACK: Uma frase de feedback encorajadora para o estudante

FORMATO DE RESPOSTA (JSON válido):
{
  "comprehension": 75,
  "action": "reinforce",
  "feedback": "Você está no caminho certo! Vamos explorar um pouco mais essa ideia."
}

CONCEITO SENDO AVALIADO: {{CONCEPT}}
RESPOSTA DO ESTUDANTE: {{STUDENT_RESPONSE}}
`;

import { arrayBufferToBase64 } from "./pdfContentService";

// ============================================================================
// Service Functions
// ============================================================================

export const extractConcepts = async (
    noteContent: string,
    mode: SubjectMode,
    pdfData?: ArrayBuffer
): Promise<LearningConcept[]> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return [];
    }

    try {
        const prompt = getConceptExtractionPrompt(mode);

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
            contentParts.push({ text: prompt + noteContent });
        }

        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: [{ role: 'user', parts: contentParts }],
            config: { temperature: 0.3 }
        });

        const text = response.text || "";
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.concepts.map((c: any) => ({
                ...c,
                completed: false
            }));
        }
    } catch (error) {
        console.error("Error extracting concepts:", error);
    }
    return [];
};

export const generateIntroduction = async (
    conceptTitle: string,
    conceptDescription: string,
    mode: SubjectMode
): Promise<IntroductionContent | null> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return null;
    }

    const prompt = getIntroductionPrompt(mode, conceptTitle, conceptDescription);

    try {
        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: prompt,
            config: {
                temperature: 0.5,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        formalDefinition: {
                            type: "string",
                            description: "Definição formal do conceito com LaTeX"
                        },
                        intuition: {
                            type: "string",
                            description: "Intuição matemática/geométrica"
                        },
                        problems: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: {
                                        type: "string",
                                        description: "ID curto e único para o problema"
                                    },
                                    title: {
                                        type: "string",
                                        description: "Título curto do problema"
                                    },
                                    description: {
                                        type: "string",
                                        description: "Descrição completa do problema. Use quebras de linha duplas (\\n\\n) para separar as seções: Título, Enunciado, Exemplos e Restrições."
                                    },
                                    focus: {
                                        type: "string",
                                        enum: ["algebraic", "geometric", "computational", "theoretical"],
                                        description: "Foco do problema"
                                    },
                                    difficulty: {
                                        type: "string",
                                        enum: ["basic", "intermediate", "advanced"],
                                        description: "Nível de dificuldade"
                                    }
                                },
                                required: ["id", "title", "description", "focus", "difficulty"]
                            }
                        }
                    },
                    required: ["formalDefinition", "intuition", "problems"]
                }
            }
        });

        const text = response.text || "";
        return JSON.parse(text) as IntroductionContent;
    } catch (error) {
        console.error("Error generating introduction:", error);
        return null;
    }
}

export const generateSocraticQuestion = async (
    session: LearningSession,
    mode: SubjectMode,
    onChunk: (text: string) => void
): Promise<void> => {
    const ai = getClient();
    if (!ai) {
        onChunk("Erro: Cliente de IA não disponível.");
        return;
    }

    const currentConcept = session.concepts[session.currentConceptIndex];
    if (!currentConcept) {
        onChunk("Parabéns! Você completou todos os conceitos desta nota. 🎉");
        return;
    }

    const dialogHistoryText = session.dialogHistory
        .slice(-6)
        .map(m => `${m.role === 'tutor' ? 'TUTOR' : 'ESTUDANTE'}: ${m.text}`)
        .join('\n');

    const socraticPrompt = getSocraticTutorPrompt(mode)
        .replace('{{CURRENT_CONCEPT}}', currentConcept.title)
        .replace('{{CONCEPT_DESCRIPTION}}', currentConcept.description)
        .replace('{{SUPPORT_LEVEL}}', session.supportLevel.toString())
        .replace('{{DIALOG_HISTORY}}', dialogHistoryText || 'Início da sessão');

    const userContext = session.dialogHistory.length === 0
        ? `Inicie a tutoria sobre o conceito "${currentConcept.title}". Faça sua primeira pergunta socrática baseada em um caso simplificado para explorar o conceito.`
        : `Continue a tutoria. O estudante respondeu: "${session.dialogHistory[session.dialogHistory.length - 1]?.text || ''}"`;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: getSelectedModel(),
            contents: [
                { role: 'user', parts: [{ text: socraticPrompt }] },
                { role: 'user', parts: [{ text: userContext }] }
            ],
            config: { temperature: 0.7 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (error: any) {
        console.error("Error generating question:", error);
        onChunk(`[Erro: ${error.message || "Falha ao gerar resposta"}]`);
    }
};

export const evaluateStudentResponse = async (
    concept: LearningConcept,
    studentResponse: string
): Promise<{ comprehension: number; action: 'advance' | 'reinforce' | 'increase_support'; feedback: string }> => {
    const ai = getClient();
    if (!ai) {
        return { comprehension: 50, action: 'reinforce', feedback: 'Continue tentando!' };
    }

    const prompt = RESPONSE_EVALUATION_PROMPT
        .replace('{{CONCEPT}}', `${concept.title}: ${concept.description}`)
        .replace('{{STUDENT_RESPONSE}}', studentResponse);

    try {
        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: prompt,
            config: { temperature: 0.2 }
        });

        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error("Error evaluating response:", error);
    }

    return { comprehension: 50, action: 'reinforce', feedback: 'Vamos continuar explorando esse conceito!' };
};

export const createLearningSession = async (
    noteId: string,
    noteName: string,
    noteContent: string,
    mode: SubjectMode,
    pdfData?: ArrayBuffer
): Promise<LearningSession | null> => {
    const concepts = await extractConcepts(noteContent, mode, pdfData);

    if (concepts.length === 0) {
        return null;
    }

    return {
        noteId,
        noteName,
        concepts,
        currentConceptIndex: 0,
        supportLevel: 1,
        dialogHistory: [],
        isComplete: false
    };
};

export const generateStepByStepSolution = async (
    conceptTitle: string,
    problem: SuggestedProblem,
    dialogHistory: LearningMessage[],
    mode: SubjectMode,
    onChunk: (chunk: string) => void
): Promise<void> => {
    const ai = getClient();
    if (!ai) return;

    const basePrompt = getStepByStepSolutionPrompt(mode)
        .replace('{{CONCEPT_TITLE}}', conceptTitle)
        .replace('{{PROBLEM_TITLE}}', problem.title)
        .replace('{{PROBLEM_DESCRIPTION}}', problem.description);

    const prompt = `${basePrompt}

    Histórico atual da conversa para contexto (se necessário):
    ${JSON.stringify(dialogHistory.map(m => ({ role: m.role, text: m.text })))}
    `;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: getSelectedModel(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { temperature: 0.3 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (error) {
        console.error("Error generating solution:", error);
        onChunk("Não foi possível gerar a solução no momento.");
    }
};
