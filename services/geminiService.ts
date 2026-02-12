import { GoogleGenAI } from "@google/genai";
import { ChatMessage, SubjectMode } from "../types";
import { } from "./prompts";
import { getActiveApiKey, getSelectedModel, getClient, subscribe, resetClient } from "./settingsService";

// Subscribe to settings changes to reset client when needed
subscribe(() => {
  resetClient();
});

export const streamGeminiResponse = async (
  prompt: string,
  context: string,
  history: ChatMessage[],
  mode: SubjectMode,
  onChunk: (text: string) => void
) => {
  const ai = getClient();
  if (!ai) {
    onChunk("Error: API Key not found. Please configure your environment.");
    return;
  }

  const modelId = getSelectedModel();

  const historyText = history.length > 0
    ? history.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.text}`).join('\n\n')
    : "None";

  const personaDescription = mode === 'mathematics'
    ? 'Você é um professor de matemática rigoroso e didático.'
    : 'Você é um engenheiro de software e cientista da computação sênior, especialista em algoritmos e sistemas.';

  const fullPrompt = `
${personaDescription} Você está integrado em um "Smart Handbook".
Use o contexto do documento e o histórico da conversa para responder de forma concisa e academicamente rigorosa.

MODO ATUAL: ${mode === 'mathematics' ? 'Matemática' : 'Computação'}

CONTEXTO DO DOCUMENTO:
${context}

HISTÓRICO DA CONVERSA:
${historyText}

PERGUNTA DO USUÁRIO:
${prompt}

${mode === 'mathematics'
      ? 'Sempre use LaTeX para expressões matemáticas (ex: $E=mc^2$). Seja formal e focado em definições e teoremas.'
      : 'Sempre use blocos de código markdown para exemplos de código. Seja prático e foque em eficiência e implementação.'}
RESPOSTA EM PORTUGUÊS DO BRASIL.
`;


  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: fullPrompt,
      config: {
        // Simulating a thinking process configuration if supported, 
        // otherwise just standard generation
        temperature: 0.7,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    onChunk(`\n\n[System Error: ${error.message || "Failed to generate response"}]`);
  }
};