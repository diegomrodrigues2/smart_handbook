import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const apiKey = process.env.API_KEY || ''; // In a real app, ensure this is handled securely

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client && apiKey) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

export const streamGeminiResponse = async (
  prompt: string,
  context: string,
  history: ChatMessage[],
  onChunk: (text: string) => void
) => {
  const ai = getClient();
  if (!ai) {
    onChunk("Error: API Key not found. Please configure your environment.");
    return;
  }

  const modelId = "gemini-3-flash-preview";

  const historyText = history.length > 0
    ? history.map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.text}`).join('\n\n')
    : "None";

  const fullPrompt = `
You are an intelligent research assistant integrated into a "Smart Handbook".
You have access to the user's current document content and recent conversation history. Use this context to answer their questions.

CURRENT DOCUMENT CONTEXT:
${context}

CONVERSATION HISTORY (LAST 3 Q&A):
${historyText}

USER QUESTION:
${prompt}

Provide a helpful, concise, and academically rigorous response. Use LaTeX for math where appropriate (e.g., $E=mc^2$).
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