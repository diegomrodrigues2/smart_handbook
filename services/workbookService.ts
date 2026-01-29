import { GoogleGenAI } from "@google/genai";
import { WorkbookExercise, WorkbookSession, SubjectMode } from "../types";
import { getExerciseGenerationPrompt, getSolutionGenerationPrompt } from "./prompts";

const apiKey = process.env.API_KEY || '';

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    if (!client) {
        client = new GoogleGenAI({ apiKey });
    }
    return client;
}

const MODEL_ID = "gemini-3-flash-preview";

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const EXERCISE_GENERATION_PROMPT = `
Você é um professor de matemática experiente criando uma lista de exercícios para um workbook.
Seu objetivo é gerar exercícios DIRETOS e PRÁTICOS que exercitem os conceitos do material fornecido.

REGRAS IMPORTANTES:
1. Gere entre 15 e 20 exercícios
2. Exercícios devem ser no estilo "drill" - focados em prática e repetição
3. Varie a dificuldade: ~30% fácil, ~50% médio, ~20% difícil
4. Cada exercício deve ser resolvível em 1-5 minutos
5. Use LaTeX para todas expressões matemáticas ($...$ para inline)
6. Exercícios devem ser independentes (não dependem um do outro)
7. Foque em diferentes aspectos do conceito

FORMATO DE SAÍDA (JSON):
{
  "exercises": [
    {
      "number": 1,
      "statement": "Calcule $\\\\frac{d}{dx}(x^3 + 2x - 1)$.",
      "difficulty": "easy",
      "topic": "Derivadas básicas"
    },
    ...
  ]
}

MATERIAL DE REFERÊNCIA:
{{NOTE_CONTENT}}

Gere a lista de exercícios em JSON válido:
`;

const SOLUTION_GENERATION_PROMPT = `
Você é um professor de matemática criando uma solução passo a passo.
Explique de forma clara e didática, como se estivesse escrevendo em um gabarito de livro.

REGRAS:
1. Divida a solução em passos claros e numerados
2. Explique o raciocínio de cada passo brevemente
3. Use LaTeX para todas expressões matemáticas
4. Seja conciso mas completo
5. Destaque a resposta final

FORMATO:
**Passo 1:** [descrição]
[cálculos com LaTeX]

**Passo 2:** [descrição]
[cálculos]

...

**Resposta:** [resultado final em destaque]

---

EXERCÍCIO:
{{EXERCISE_STATEMENT}}

TÓPICO: {{EXERCISE_TOPIC}}

CONTEXTO DO MATERIAL (se relevante):
{{NOTE_CONTENT}}

Forneça a solução passo a passo:
`;

// ============================================================================
// Service Functions
// ============================================================================

// Schema for structured output - basic exercises
const exerciseListSchema = {
    type: "object" as const,
    properties: {
        exercises: {
            type: "array" as const,
            items: {
                type: "object" as const,
                properties: {
                    number: { type: "integer" as const },
                    statement: { type: "string" as const },
                    difficulty: { type: "string" as const, enum: ["easy", "medium", "hard"] },
                    topic: { type: "string" as const }
                },
                required: ["number", "statement", "difficulty", "topic"]
            }
        }
    },
    required: ["exercises"]
};

// Schema for AWS-style multiple choice exercises (data-engineering mode)
const exerciseListSchemaWithOptions = {
    type: "object" as const,
    properties: {
        exercises: {
            type: "array" as const,
            items: {
                type: "object" as const,
                properties: {
                    number: { type: "integer" as const },
                    statement: { type: "string" as const },
                    difficulty: { type: "string" as const, enum: ["easy", "medium", "hard"] },
                    topic: { type: "string" as const },
                    questionType: { type: "string" as const, enum: ["open", "multiple-choice"] },
                    responseFormat: { type: "string" as const, enum: ["single", "multiple"] },
                    selectCount: { type: "integer" as const },
                    options: {
                        type: "array" as const,
                        items: {
                            type: "object" as const,
                            properties: {
                                label: { type: "string" as const },
                                text: { type: "string" as const }
                            },
                            required: ["label", "text"]
                        }
                    }
                },
                required: ["number", "statement", "difficulty", "topic", "questionType", "responseFormat", "selectCount", "options"]
            }
        }
    },
    required: ["exercises"]
};

import { arrayBufferToBase64 } from "./pdfContentService";

export async function generateExerciseList(
    noteContent: string,
    mode: SubjectMode,
    pdfData?: ArrayBuffer
): Promise<WorkbookExercise[] | null> {
    try {
        const client = getClient();
        const promptTemplate = getExerciseGenerationPrompt(mode);
        const prompt = promptTemplate.replace('{{NOTE_CONTENT}}', pdfData ? "[PDF ATTACHED]" : noteContent);

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

        // Use appropriate schema based on mode
        // Both computing (Software Engineering) and data-engineering use AWS-style multiple choice
        const schemaToUse = (mode === 'data-engineering' || mode === 'computing')
            ? exerciseListSchemaWithOptions
            : exerciseListSchema;

        const response = await client.models.generateContent({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.7,
                topP: 0.9,
                responseMimeType: "application/json",
                responseSchema: schemaToUse
            }
        });

        const text = response.text || '';

        // Parse the structured JSON response
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (parseError) {
            console.error('JSON parse error, attempting to fix:', parseError);
            // Try to fix common escape issues
            const fixedText = text
                .replace(/\\/g, '\\\\')  // Double escape backslashes
                .replace(/\\\\\\\\/g, '\\\\'); // But don't quadruple them
            parsed = JSON.parse(fixedText);
        }

        if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
            console.error('Invalid response structure');
            return null;
        }

        // Convert to WorkbookExercise format
        const exercises: WorkbookExercise[] = parsed.exercises.map((ex: any, index: number) => ({
            id: `exercise-${Date.now()}-${index}`,
            number: ex.number || index + 1,
            statement: ex.statement,
            difficulty: ex.difficulty || 'medium',
            topic: ex.topic || 'Geral',
            solution: undefined,
            isExpanded: false,
            isGeneratingSolution: false,
            // AWS-style multiple choice fields (for data-engineering mode)
            questionType: ex.questionType || 'open',
            responseFormat: ex.responseFormat || 'single',
            selectCount: ex.selectCount || 1,
            options: ex.options?.map((opt: any) => ({
                label: opt.label,
                text: opt.text
            })) || undefined,
            selectedAnswers: []
        }));

        return exercises;
    } catch (error) {
        console.error('Error generating exercises:', error);
        return null;
    }
}

export async function generateWorkbookSolution(
    exercise: WorkbookExercise,
    noteContent: string,
    mode: SubjectMode,
    onChunk: (chunk: string) => void,
    pdfData?: ArrayBuffer
): Promise<void> {
    try {
        const client = getClient();

        // Format options for multiple-choice questions
        let optionsText = '';
        if (exercise.options && exercise.options.length > 0) {
            optionsText = exercise.options
                .map(opt => `${opt.label}) ${opt.text}`)
                .join('\n');
        }

        const promptTemplate = getSolutionGenerationPrompt(mode);
        let prompt = promptTemplate
            .replace('{{EXERCISE_STATEMENT}}', exercise.statement)
            .replace('{{EXERCISE_TOPIC}}', exercise.topic)
            .replace('{{NOTE_CONTENT}}', pdfData ? "[PDF ATTACHED]" : noteContent.substring(0, 3000)); // Limit context

        // Replace options placeholder if present
        if (promptTemplate.includes('{{EXERCISE_OPTIONS}}')) {
            prompt = prompt.replace('{{EXERCISE_OPTIONS}}', optionsText || 'N/A');
        }

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

        const response = await client.models.generateContentStream({
            model: MODEL_ID,
            contents: [{ role: 'user', parts: contentParts }],
            config: {
                temperature: 0.3,
                topP: 0.9,
            }
        });

        for await (const chunk of response) {
            const text = chunk.text || '';
            if (text) {
                onChunk(text);
            }
        }
    } catch (error) {
        console.error('Error generating solution:', error);
        throw error;
    }
}

export function createWorkbookSession(
    noteId: string,
    noteName: string,
    exercises: WorkbookExercise[]
): WorkbookSession {
    return {
        noteId,
        noteName,
        exercises,
        generatedAt: new Date()
    };
}
