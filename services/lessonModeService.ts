import { GoogleGenAI } from "@google/genai";
import { LessonPlan, LessonSection, SubjectMode } from "../types";
import { getLessonPlanPrompt, getLessonContentPrompt } from "./prompts";
import { arrayBufferToBase64 } from "./pdfContentService";
import { getClient, getSelectedModel, subscribe, resetClient } from "./settingsService";

// Subscribe to settings changes to reset client when needed
subscribe(() => {
    resetClient();
});

/**
 * Creates content parts for API call, supporting both text and PDF
 */
const createContentParts = (prompt: string, noteContent: string, pdfData?: ArrayBuffer): any[] => {
    if (pdfData) {
        return [
            {
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            },
            { text: prompt }
        ];
    }
    return [{ text: prompt + noteContent }];
};

// ============================================================================
// SYSTEM PROMPTS - Lesson Generation
// ============================================================================

const LESSON_PLAN_PROMPT = `
Você é um professor universitário experiente em criar planos de aula estruturados.
Sua tarefa é analisar o conteúdo de uma nota de estudo e criar um plano de aula de 45 minutos.

REGRAS:
1. A aula deve ter exatamente 45 minutos de duração total
2. Divida em 5-7 seções com tempos específicos
3. Inclua: introdução, fundamentação teórica, exemplos, exercícios práticos e conclusão
4. Cada seção deve ter um propósito pedagógico claro
5. Os objetivos de aprendizagem devem ser específicos e mensuráveis

FORMATO DE RESPOSTA (JSON válido):
{
  "title": "Título da Aula",
  "duration": "45 minutos",
  "objectives": [
    "Objetivo 1: O que o aluno será capaz de fazer",
    "Objetivo 2: ...",
    "Objetivo 3: ..."
  ],
  "sections": [
    {
      "id": "section_1",
      "title": "Introdução e Contextualização",
      "duration": "5 min",
      "type": "introduction",
      "description": "Breve descrição do que será abordado nesta seção"
    },
    {
      "id": "section_2",
      "title": "Fundamentação Teórica",
      "duration": "15 min",
      "type": "explanation",
      "description": "..."
    }
  ]
}

TIPOS DE SEÇÃO PERMITIDOS:
- introduction: Contextualização e motivação
- explanation: Conteúdo teórico formal
- example: Exemplos resolvidos passo a passo
- practice: Exercícios para os alunos
- discussion: Discussão de conceitos e dúvidas
- conclusion: Síntese e fechamento

CONTEÚDO DA NOTA:
`;

const LESSON_CONTENT_PROMPT = `
Você é um professor universitário ministrando uma aula formal de matemática.
Gere o conteúdo COMPLETO da aula seguindo EXATAMENTE o plano fornecido.

INSTRUÇÕES CRÍTICAS:
1. Gere um documento contínuo em Markdown (NÃO slides)
2. Use linguagem acadêmica formal mas acessível
3. Seja EXTREMAMENTE detalhado e didático
4. Inclua pausas retóricas e transições entre seções
5. Use LaTeX para TODAS expressões matemáticas ($...$ inline, $$...$$ display)
6. Inclua comentários do professor entre parênteses quando apropriado
7. Gere o conteúdo de forma que o aluno possa acompanhar passo a passo

ESTRUTURA OBRIGATÓRIA PARA CADA SEÇÃO:

## [Número]. [Título da Seção] ([Duração])

[Conteúdo extenso e detalhado da seção...]

---

PARA SEÇÕES TEÓRICAS (explanation):
- Definições formais com notação rigorosa
- Propriedades e teoremas relevantes
- Observações importantes e armadilhas comuns
- Conexões com conceitos anteriores

PARA EXEMPLOS (example):
- Enunciado claro do problema
- Solução passo a passo com justificativas
- Comentários sobre escolhas de estratégia
- Verificação do resultado quando aplicável

PARA EXERCÍCIOS (practice):
- Enunciados claros
- Dicas para resolução (sem dar a resposta)
- Indicação de tempo sugerido

PARA CONCLUSÃO (conclusion):
- Resumo dos pontos principais
- Conexões com tópicos futuros
- Sugestões de leitura complementar

PLANO DA AULA:
{{LESSON_PLAN}}

CONTEÚDO BASE (nota de estudo):
{{NOTE_CONTENT}}

RESPONDA EM PORTUGUÊS DO BRASIL.
Comece diretamente com o título da aula (# Aula: ...) sem preâmbulos.
`;

// ============================================================================
// Service Functions
// ============================================================================

export const generateLessonPlan = async (
    noteContent: string,
    mode: SubjectMode,
    pdfData?: ArrayBuffer
): Promise<LessonPlan | null> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return null;
    }

    try {
        const prompt = getLessonPlanPrompt(mode);
        const contentParts = createContentParts(prompt, noteContent, pdfData);

        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.4,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        duration: { type: "string" },
                        objectives: {
                            type: "array",
                            items: { type: "string" }
                        },
                        sections: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    duration: { type: "string" },
                                    type: {
                                        type: "string",
                                        enum: ["introduction", "explanation", "example", "practice", "discussion", "conclusion"]
                                    },
                                    description: { type: "string" }
                                },
                                required: ["id", "title", "duration", "type", "description"]
                            }
                        }
                    },
                    required: ["title", "duration", "objectives", "sections"]
                }
            }
        });

        const text = response.text || "";
        return JSON.parse(text) as LessonPlan;
    } catch (error) {
        console.error("Error generating lesson plan:", error);
        return null;
    }
};

export const generateLessonContent = async (
    plan: LessonPlan,
    noteContent: string,
    mode: SubjectMode,
    onChunk: (text: string) => void,
    pdfData?: ArrayBuffer
): Promise<void> => {
    const ai = getClient();
    if (!ai) {
        onChunk("Erro: Cliente de IA não disponível.");
        return;
    }

    const basePrompt = getLessonContentPrompt(mode)
        .replace("{{LESSON_PLAN}}", JSON.stringify(plan, null, 2))
        .replace("{{NOTE_CONTENT}}", pdfData ? "[Conteúdo no PDF anexado]" : noteContent);

    // Create content parts with PDF attachment if available
    let contentParts: any[];
    if (pdfData) {
        contentParts = [
            {
                inlineData: {
                    data: arrayBufferToBase64(pdfData),
                    mimeType: 'application/pdf'
                }
            },
            { text: basePrompt }
        ];
    } else {
        contentParts = [{ text: basePrompt }];
    }

    try {
        const responseStream = await ai.models.generateContentStream({
            model: getSelectedModel(),
            contents: [{ role: 'user', parts: contentParts }],
            config: { temperature: 0.7 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (error: any) {
        console.error("Error generating lesson content:", error);
        onChunk(`[Erro: ${error.message || "Falha ao gerar conteúdo da aula"}]`);
    }
};

export const refineLessonPlan = async (
    currentPlan: LessonPlan,
    noteContent: string,
    userFeedback: string
): Promise<LessonPlan | null> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return null;
    }

    const prompt = `
Você é um professor universitário experiente em criar planos de aula estruturados.
O usuário está solicitando alterações no plano de aula atual.

PLANO ATUAL:
${JSON.stringify(currentPlan, null, 2)}

CONTEÚDO DA NOTA (para referência):
${noteContent}

FEEDBACK DO USUÁRIO:
"${userFeedback}"

INSTRUÇÕES:
1. Analise o feedback do usuário cuidadosamente
2. Modifique o plano de acordo com as solicitações
3. Mantenha a duração total de 45 minutos
4. Preserve elementos que não foram mencionados no feedback
5. Seja criativo ao interpretar pedidos vagos

TIPOS DE SEÇÃO PERMITIDOS:
- introduction: Contextualização e motivação
- explanation: Conteúdo teórico formal
- example: Exemplos resolvidos passo a passo
- practice: Exercícios para os alunos
- discussion: Discussão de conceitos e dúvidas
- conclusion: Síntese e fechamento

Retorne o plano revisado no mesmo formato JSON.
`;

    try {
        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: prompt,
            config: {
                temperature: 0.4,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        duration: { type: "string" },
                        objectives: {
                            type: "array",
                            items: { type: "string" }
                        },
                        sections: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    duration: { type: "string" },
                                    type: {
                                        type: "string",
                                        enum: ["introduction", "explanation", "example", "practice", "discussion", "conclusion"]
                                    },
                                    description: { type: "string" }
                                },
                                required: ["id", "title", "duration", "type", "description"]
                            }
                        }
                    },
                    required: ["title", "duration", "objectives", "sections"]
                }
            }
        });

        const text = response.text || "";
        return JSON.parse(text) as LessonPlan;
    } catch (error) {
        console.error("Error refining lesson plan:", error);
        return null;
    }
};
