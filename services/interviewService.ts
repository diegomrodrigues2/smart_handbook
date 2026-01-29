import { GoogleGenAI } from "@google/genai";
import { InterviewQuestion, InterviewSession, InterviewMessage, InterviewEvaluation } from "../types";
import {
    getInterviewQuestionsPrompt,
    getInterviewEvaluationPrompt,
    getInterviewFollowUpPrompt,
    getInterviewFinalVerdictPrompt
} from "./prompts";

const apiKey = process.env.API_KEY || '';

let client: GoogleGenAI | null = null;

const getClient = () => {
    if (!client && apiKey) {
        client = new GoogleGenAI({ apiKey });
    }
    return client;
};

const MODEL_ID = "gemini-3-flash-preview";

// Research content from both research files for interview context
const INTERVIEW_RESEARCH_CONTENT = `
# Domínio Estratégico de Entrevistas Técnicas Conceituais

## Framework CCMT (Conceito-Contexto-Mecanismo-Tradeoff)
- Conceito: Defina o termo com precisão usando terminologia padrão.
- Contexto: Explique o cenário onde o conceito se torna relevante.
- Mecanismo: Descreva o processo interno. Use abordagem sequencial.
- Trade-off/Mitigação: Explique desvantagens ou como lidar com casos extremos.

## Matriz de Comparação
Dimensões padrão para comparar sistemas:
- Estrutura de Dados/Modelo
- Modelo de Consistência (ACID vs BASE)
- Escalabilidade (Vertical vs Horizontal)
- Adequação ao Caso de Uso

## Tópicos Técnicos Essenciais

### Internals de Banco de Dados
- B-Trees vs LSM Trees: trade-offs de leitura/escrita
- Teorema CAP e PACELC
- Sharding: Range-based, Hash-based, Consistent Hashing

### Concorrência
- Deadlocks e Condições de Coffman
- Thread vs Process: isolamento de memória, troca de contexto
- GIL do Python, Goroutines do Go

### Sistemas Distribuídos
- Consistência Eventual vs Forte
- Fan-out patterns
- CRDTs e Transformação Operacional

### Garbage Collection
- Mark-Sweep-Compact
- Gerações: Young, Old, Metaspace
- G1 GC: regiões e pausas previsíveis

## Critérios de Avaliação
- Profundidade de Conhecimento vs Trivialidade
- Análise de Trade-offs (argumentar contra a própria escolha)
- Clareza de Comunicação
- Prospera na Ambiguidade

## Níveis de Sinal
- Nível 1 (Júnior): Respostas superficiais, sem considerar escala
- Nível 2 (Mid): Faz perguntas básicas, precisa de dicas
- Nível 3 (Sênior): Define requisitos, calcula estimativas, justifica escolhas
- Nível 4 (Staff): Antecipa requisitos futuros, desafia premissas, discute evolução
`;

import { arrayBufferToBase64 } from "./pdfContentService";

export const generateInterviewQuestions = async (
    noteContent: string,
    noteName: string,
    pdfData?: ArrayBuffer
): Promise<InterviewQuestion[]> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return [];
    }

    try {
        const prompt = getInterviewQuestionsPrompt(pdfData ? "[PDF ATTACHED]" : noteContent, noteName);

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
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    number: { type: "integer" },
                                    category: { type: "string" },
                                    difficulty: { type: "string" },
                                    question: { type: "string" },
                                    expectedTopics: { type: "array", items: { type: "string" } }
                                },
                                required: ["id", "number", "category", "difficulty", "question", "expectedTopics"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        });

        const text = response.text || "";
        const parsed = JSON.parse(text);
        return parsed.questions.map((q: any) => ({
            ...q,
            answered: false
        }));
    } catch (error) {
        console.error("Error generating interview questions:", error);
    }
    return [];
};

export const startInterviewSession = async (
    noteId: string,
    noteName: string,
    noteContent: string,
    pdfData?: ArrayBuffer
): Promise<InterviewSession | null> => {
    const questions = await generateInterviewQuestions(noteContent, noteName, pdfData);
    if (questions.length === 0) return null;

    return {
        noteId,
        noteName,
        questions,
        currentQuestionIndex: 0,
        messages: [],
        isComplete: false
    };
};

export const getInterviewerResponse = async (
    session: InterviewSession,
    noteContent: string,
    onChunk: (text: string) => void,
    recentImage?: { mimeType: string, data: string },
    pdfData?: ArrayBuffer
): Promise<void> => {
    const ai = getClient();
    if (!ai) {
        onChunk("Erro: Cliente de IA não disponível.");
        return;
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];

    const dialogHistoryText = session.messages
        .map(m => `${m.role === 'interviewer' ? 'ENTREVISTADOR' : 'CANDIDATO'}: ${m.text}${m.imageUrl ? ' [Imagem Anexada]' : ''}`)
        .join('\n');

    const prompt = getInterviewFollowUpPrompt(
        currentQuestion,
        INTERVIEW_RESEARCH_CONTENT,
        pdfData ? "[PDF ATTACHED]" : noteContent,
        dialogHistoryText || 'Início da entrevista'
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
        console.error("Error generating interviewer response:", error);
        onChunk(`[Erro: ${error.message || "Falha ao gerar resposta"}]`);
    }
};

export const evaluateCandidateResponse = async (
    session: InterviewSession,
    candidateResponse: string
): Promise<InterviewEvaluation | null> => {
    const ai = getClient();
    if (!ai) return null;

    const currentQuestion = session.questions[session.currentQuestionIndex];

    const dialogHistoryText = session.messages
        .map(m => `${m.role === 'interviewer' ? 'ENTREVISTADOR' : 'CANDIDATO'}: ${m.text}`)
        .join('\n');

    const prompt = getInterviewEvaluationPrompt(
        currentQuestion,
        candidateResponse,
        dialogHistoryText,
        INTERVIEW_RESEARCH_CONTENT
    );

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                temperature: 0.5,
                topP: 0.9,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        score: { type: "string", enum: ["strong_hire", "hire", "mixed", "no_hire"] },
                        dimensions: {
                            type: "object",
                            properties: {
                                depth: { type: "integer" },
                                tradeoffs: { type: "integer" },
                                communication: { type: "integer" }
                            }
                        },
                        feedback: { type: "string" },
                        strengths: { type: "array", items: { type: "string" } },
                        improvements: { type: "array", items: { type: "string" } }
                    },
                    required: ["score", "dimensions", "feedback", "strengths", "improvements"]
                }
            }
        });

        const text = response.text || "";
        return JSON.parse(text);
    } catch (error) {
        console.error("Error evaluating response:", error);
        return null;
    }
};

export const generateFinalVerdict = async (
    session: InterviewSession
): Promise<{ overallScore: 'strong_hire' | 'hire' | 'mixed' | 'no_hire'; summary: string; recommendation: string } | null> => {
    const ai = getClient();
    if (!ai) return null;

    const prompt = getInterviewFinalVerdictPrompt(session.questions, INTERVIEW_RESEARCH_CONTENT);

    try {
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: prompt,
            config: {
                temperature: 0.5,
                topP: 0.9,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        overallScore: { type: "string", enum: ["strong_hire", "hire", "mixed", "no_hire"] },
                        summary: { type: "string" },
                        recommendation: { type: "string" }
                    },
                    required: ["overallScore", "summary", "recommendation"]
                }
            }
        });

        const text = response.text || "";
        return JSON.parse(text);
    } catch (error) {
        console.error("Error generating final verdict:", error);
        return null;
    }
};

export const generateModelAnswer = async (
    question: InterviewQuestion,
    noteContent: string,
    onChunk: (text: string) => void,
    pdfData?: ArrayBuffer
): Promise<void> => {
    const ai = getClient();
    if (!ai) {
        onChunk("Erro: Cliente de IA não disponível.");
        return;
    }

    const categoryLabels: Record<string, string> = {
        'database_internals': 'Internals de Banco de Dados',
        'concurrency': 'Concorrência e Multithreading',
        'distributed_systems': 'Sistemas Distribuídos',
        'networking': 'Redes e Protocolos',
        'languages_runtimes': 'Linguagens e Runtimes',
        'os_fundamentals': 'Fundamentos de Sistemas Operacionais'
    };

    const prompt = `Você é um engenheiro sênior experiente em entrevistas técnicas.

CONTEXTO DA NOTA DE ESTUDO:
${pdfData ? "[PDF ANEXADO]" : noteContent}

METODOLOGIA DE ENTREVISTAS TÉCNICAS:
${INTERVIEW_RESEARCH_CONTENT}

QUESTÃO A SER RESPONDIDA:
Categoria: ${categoryLabels[question.category] || question.category}
Dificuldade: ${question.difficulty}
Pergunta: ${question.question}
Tópicos Esperados: ${question.expectedTopics.join(', ')}

TAREFA:
Gere uma RESPOSTA MODELO exemplar que demonstra como um candidato de nível Staff+ deveria responder a esta questão.

A resposta deve seguir o framework CCMT:
1. **Conceito**: Definição precisa usando terminologia padrão
2. **Contexto**: Cenário onde o conceito se torna relevante
3. **Mecanismo**: Descrição do processo interno, passo a passo
4. **Trade-off**: Análise de vantagens/desvantagens e quando usar ou não

FORMATO DA RESPOSTA:
- Use Markdown formatado
- Seja abrangente mas conciso
- Inclua exemplos práticos quando relevante
- Mencione trade-offs e alternativas
- Demonstre profundidade técnica sem ser excessivamente verboso

Responda em português brasileiro.`;

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
            config: { temperature: 0.6 }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                onChunk(chunk.text);
            }
        }
    } catch (error: any) {
        console.error("Error generating model answer:", error);
        onChunk(`[Erro: ${error.message || "Falha ao gerar resposta modelo"}]`);
    }
};

export const generateInterviewTranscript = async (
    session: InterviewSession,
    noteName: string
): Promise<string> => {
    const scoreLabels: Record<string, string> = {
        'strong_hire': '🟢 FORTE CONTRATAÇÃO',
        'hire': '🟡 CONTRATAÇÃO',
        'mixed': '🟠 MISTO/TALVEZ',
        'no_hire': '🔴 NÃO CONTRATAR'
    };

    const categoryLabels: Record<string, string> = {
        'database_internals': 'Internals de Banco de Dados',
        'concurrency': 'Concorrência e Multithreading',
        'distributed_systems': 'Sistemas Distribuídos',
        'networking': 'Redes e Protocolos',
        'languages_runtimes': 'Linguagens e Runtimes',
        'os_fundamentals': 'Fundamentos de Sistemas Operacionais'
    };

    let content = `# Transcrição de Entrevista Técnica\n\n`;
    content += `**Tema Base:** ${noteName}\n`;
    content += `**Data:** ${new Date().toLocaleString('pt-BR')}\n`;
    content += `**Total de Questões:** ${session.questions.length}\n\n`;

    // Final Verdict Summary
    if (session.finalVerdict) {
        content += `---\n\n## 📊 Veredicto Final\n\n`;
        content += `**Resultado:** ${scoreLabels[session.finalVerdict.overallScore]}\n\n`;
        content += `### Resumo\n${session.finalVerdict.summary}\n\n`;
        content += `### Recomendação\n${session.finalVerdict.recommendation}\n\n`;
    }

    content += `---\n\n## 📝 Questões e Avaliações\n\n`;

    for (const question of session.questions) {
        content += `### Questão ${question.number}: ${categoryLabels[question.category] || question.category}\n\n`;
        content += `**Dificuldade:** ${question.difficulty.toUpperCase()}\n\n`;
        content += `**Pergunta:**\n> ${question.question}\n\n`;

        // Get all messages for this question
        const questionMessages = session.messages.filter(m => m.questionId === question.id);

        // Look for model answer message (starts with "## 📚 Resposta Modelo")
        const modelAnswerMsg = questionMessages.find(m =>
            m.role === 'interviewer' && m.text.includes('## 📚 Resposta Modelo')
        );

        if (modelAnswerMsg) {
            // Extract the model answer (remove the header)
            const modelAnswerContent = modelAnswerMsg.text.replace('## 📚 Resposta Modelo\n\n', '');
            content += `**📚 Resposta Modelo:**\n\n${modelAnswerContent}\n\n`;
        } else if (question.candidateResponse && question.candidateResponse !== '[Resposta modelo gerada automaticamente]') {
            // Include actual candidate response if it exists
            content += `**Resposta do Candidato:**\n${question.candidateResponse}\n\n`;

            // Also include the dialogue if there were follow-up exchanges
            const candidateMessages = questionMessages.filter(m => m.role === 'candidate');
            const interviewerResponses = questionMessages.filter(m =>
                m.role === 'interviewer' && !m.text.includes('## 📚 Resposta Modelo')
            ).slice(1); // Skip the first interviewer message (question presentation)

            if (candidateMessages.length > 0 || interviewerResponses.length > 0) {
                content += `**Diálogo Completo:**\n\n`;
                for (const msg of questionMessages) {
                    if (msg.role === 'interviewer' && !msg.text.includes('## 📚 Resposta Modelo')) {
                        content += `**🎙️ Entrevistador:**\n${msg.text}\n\n`;
                    } else if (msg.role === 'candidate') {
                        content += `**💬 Candidato:**\n${msg.text}\n\n`;
                    }
                }
            }
        } else if (question.candidateResponse) {
            content += `**Resposta do Candidato:**\n${question.candidateResponse}\n\n`;
        }

        if (question.evaluation) {
            const eval_ = question.evaluation;
            content += `**Avaliação:** ${scoreLabels[eval_.score]}\n\n`;
            content += `| Dimensão | Nota (1-4) |\n`;
            content += `|----------|------------|\n`;
            content += `| Profundidade de Conhecimento | ${eval_.dimensions.depth}/4 |\n`;
            content += `| Análise de Trade-offs | ${eval_.dimensions.tradeoffs}/4 |\n`;
            content += `| Clareza de Comunicação | ${eval_.dimensions.communication}/4 |\n\n`;

            content += `**Feedback:**\n${eval_.feedback}\n\n`;

            if (eval_.strengths.length > 0) {
                content += `**Pontos Fortes:**\n`;
                eval_.strengths.forEach(s => content += `- ✅ ${s}\n`);
                content += `\n`;
            }

            if (eval_.improvements.length > 0) {
                content += `**Áreas de Melhoria:**\n`;
                eval_.improvements.forEach(i => content += `- 📌 ${i}\n`);
                content += `\n`;
            }
        }

        content += `---\n\n`;
    }

    content += `\n*Gerado automaticamente pelo Smart Handbook Interview Mode em ${new Date().toLocaleString('pt-BR')}*\n`;

    return content;
};
