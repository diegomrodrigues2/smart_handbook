import { GoogleGenAI } from "@google/genai";
import { LearningConcept, LearningMessage, LearningSession, SuggestedProblem, IntroductionContent } from "../types";

const apiKey = process.env.API_KEY || '';

let client: GoogleGenAI | null = null;

const getClient = () => {
    if (!client && apiKey) {
        client = new GoogleGenAI({ apiKey });
    }
    return client;
};

const MODEL_ID = "gemini-3-flash-preview";

// ============================================================================
// SYSTEM PROMPTS - Pedagogical Instructions
// ============================================================================

const CONCEPT_EXTRACTION_PROMPT = `
Você é um especialista em análise pedagógica de conteúdo acadêmico.
Sua tarefa é analisar o conteúdo de uma nota de estudo e extrair os conceitos-chave que o estudante precisa aprender.

REGRAS:
1. Identifique entre 3 a 7 conceitos principais
2. Ordene do mais fundamental ao mais avançado
3. Identifique dependências entre conceitos (qual precisa ser entendido antes)
4. Forneça uma descrição breve de cada conceito

FORMATO DE RESPOSTA (JSON válido):
{
  "concepts": [
    {
      "id": "concept_1",
      "title": "Nome do Conceito",
      "description": "Breve descrição do que o estudante precisa entender",
      "dependencies": []
    },
    {
      "id": "concept_2",
      "title": "Conceito Dependente",
      "description": "Este depende do anterior",
      "dependencies": ["concept_1"]
    }
  ]
}

CONTEÚDO DA NOTA:
`;

const SOCRATIC_TUTOR_PROMPT = `
Você é um tutor socrático especializado em ensino adaptativo para estudantes de nível acadêmico avançado.
Seu papel é guiar o estudante a descobrir e compreender conceitos através de perguntas, NUNCA dando respostas diretas.

PRINCÍPIOS PEDAGÓGICOS OBRIGATÓRIOS:
1. NUNCA forneça a resposta direta - faça perguntas que guiem o raciocínio
2. EVITE analogias à vida cotidiana - prefira construções formais passo a passo
3. Use problemas simplificados como scaffolding (ex: casos 2x2 antes de nxn, funções simples antes de gerais)
4. Faça apenas UMA pergunta por vez
5. Valide a compreensão antes de avançar
6. Se o estudante errar, não corrija - faça perguntas que o levem a perceber o erro
7. Assuma familiaridade com notação matemática formal e conceitos fundamentais

ESTRATÉGIA DE SCAFFOLDING COM PROBLEMAS SIMPLIFICADOS:
- Comece com casos particulares (dimensão baixa, números pequenos, exemplos concretos)
- Guie o estudante a identificar padrões no caso simples
- Depois peça para generalizar para o caso geral
- Use contraexemplos estratégicos para testar compreensão

NÍVEIS DE SUPORTE (Least-to-Most Prompting):
- Nível 1 (Mínimo): Pergunta aberta sobre o conceito
- Nível 2 (Conceitual): Sugira um caso simplificado para explorar primeiro
- Nível 3 (Procedimental): Apresente um problema específico simples para resolver
- Nível 4 (Modelo): Resolva um exemplo análogo simplificado passo a passo e peça para aplicar ao caso original

CONTEXTO DA SESSÃO:
- Conceito atual: {{CURRENT_CONCEPT}}
- Descrição: {{CONCEPT_DESCRIPTION}}
- Nível de suporte atual: {{SUPPORT_LEVEL}}
- Histórico do diálogo: {{DIALOG_HISTORY}}

RESPONDA EM PORTUGUÊS DO BRASIL.
Use LaTeX para todas expressões matemáticas (formato: $expressão$ para inline, $$expressão$$ para display).
`;

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

// ============================================================================
// Service Functions
// ============================================================================

export const extractConcepts = async (noteContent: string): Promise<LearningConcept[]> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return [];
    }

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: CONCEPT_EXTRACTION_PROMPT + noteContent,
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
    conceptDescription: string
): Promise<IntroductionContent | null> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return null;
    }

    const prompt = `Você é um tutor matemático. Para o conceito "${conceptTitle}" (${conceptDescription}), forneça:

1. DEFINIÇÃO FORMAL: A definição matemática rigorosa com notação LaTeX
2. INTUIÇÃO: A intuição matemática/geométrica por trás do conceito (sem analogias cotidianas)
3. PROBLEMAS: Entre problemas progressivos para explorar o conceito de diferentes ângulos (algébrico, geométrico, computacional, teórico)

Os problemas DEVEM:
- Ter IDs curtos e únicos (ex: "prob_1", "prob_2")
- Ter exemplos numéricos concretos (matrizes 2x2, vetores em R², etc) sempre que possível
- Cobrir diferentes perspectivas: alguns focados em manipulação simbólica, outros em visualização espacial e outros em aspectos computacionais ou teóricos
- Ser progressivos (de exemplos triviais a casos que exigem generalização)
- Ser auto-contidos e poderem ser resolvidos passo a passo socraticamente

Responda usando LaTeX para todas expressões matemáticas.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
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
                                        description: "Descrição com exemplo numérico específico"
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

    const prompt = SOCRATIC_TUTOR_PROMPT
        .replace('{{CURRENT_CONCEPT}}', currentConcept.title)
        .replace('{{CONCEPT_DESCRIPTION}}', currentConcept.description)
        .replace('{{SUPPORT_LEVEL}}', session.supportLevel.toString())
        .replace('{{DIALOG_HISTORY}}', dialogHistoryText || 'Início da sessão');

    const userContext = session.dialogHistory.length === 0
        ? `Inicie a tutoria sobre o conceito "${currentConcept.title}". Faça sua primeira pergunta socrática baseada em um caso simplificado para explorar o conceito. Use LaTeX para expressões matemáticas.`
        : `Continue a tutoria. O estudante respondeu: "${session.dialogHistory[session.dialogHistory.length - 1]?.text || ''}"`;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: MODEL_ID,
            contents: [
                { role: 'user', parts: [{ text: prompt }] },
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
            model: MODEL_ID,
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
    noteContent: string
): Promise<LearningSession | null> => {
    const concepts = await extractConcepts(noteContent);

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
    onChunk: (chunk: string) => void
): Promise<void> => {
    const ai = getClient();
    if (!ai) return;

    const prompt = `Você agora é um tutor resolvendo o problema passo a passo. 
    CONCEITO: ${conceptTitle}
    PROBLEMA: ${problem.title}
    ENUNCIADO: ${problem.description}

    Apresente a solução de forma extremamente didática e estruturada, seguindo este formato:
    1. ESTRATÉGIA: Explique qual o raciocínio inicial e quais teoremas/definições serão usados.
    2. RESOLUÇÃO PASSO A PASSO: Divida a resolução em etapas numeradas (A, B, C...). Use LaTeX para todas as fórmulas.
    3. CONCLUSÃO: Apresente o resultado final e uma breve observação sobre a importância teórica desse resultado.

    Mesmo que o aluno já tenha tentado algo no histórico, forneça a resolução completa desde o início.
    Histórico atual da conversa para contexto (se necessário):
    ${JSON.stringify(dialogHistory.map(m => ({ role: m.role, text: m.text })))}
    `;

    try {
        const responseStream = await ai.models.generateContentStream({
            model: MODEL_ID,
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
