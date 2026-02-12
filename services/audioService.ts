import { GoogleGenAI } from "@google/genai";
import { getClient, getSelectedModel, subscribe, resetClient } from "./settingsService";

// Subscribe to settings changes to reset client when needed
subscribe(() => {
    resetClient();
});

// TTS-specific model (not affected by settings model selection)
const TTS_MODEL_ID = "gemini-2.5-flash-preview-tts";

// ============================================================================
// Audio Explanation Service
// ============================================================================

const EXPLANATION_PROMPT = `
Você é um professor universitário experiente explicando conceitos para seus alunos de forma clara e concisa.
Sua tarefa é transformar o conteúdo da nota de estudo em uma explicação oral natural, como se estivesse dando uma mini-aula.

INSTRUÇÕES:
1. Use linguagem natural e fluida, como se estivesse falando
2. Seja aprofundado e completo - explique os pontos principais no detalhe
3. Use pausas naturais (vírgulas, pontos) para dar ritmo
4. Evite notação matemática complexa - descreva verbalmente quando possível
5. Adicione conectivos e transições para soar natural
6. Minino de 2-3 minutos de explicação (cerca de 1000-2000 palavras)
7. Comece com uma breve introdução do tema
8. Termine com um resumo dos pontos-chave

IMPORTANTE:
- NÃO use símbolos matemáticos como $, \\, etc
- Escreva as fórmulas por extenso (ex: "x ao quadrado" em vez de "x²")
- Use frases curtas e claras
- Mantenha um tom professoral mas acessível

CONTEÚDO DA NOTA:
`;

export interface AudioExplanation {
    text: string;
    audioBase64: string;
    mimeType: string;
}

export const generateAudioExplanation = async (
    noteContent: string,
    onProgress?: (status: string) => void
): Promise<AudioExplanation | null> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return null;
    }

    try {
        // Step 1: Generate the explanation text
        onProgress?.("Gerando roteiro da explicação...");

        const textResponse = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: EXPLANATION_PROMPT + noteContent,
            config: { temperature: 0.7 }
        });

        const explanationText = textResponse.text || "";

        if (!explanationText) {
            console.error("No explanation text generated");
            return null;
        }

        // Step 2: Generate audio from the explanation text
        onProgress?.("Sintetizando áudio...");

        const audioResponse = await ai.models.generateContent({
            model: TTS_MODEL_ID,
            contents: explanationText,
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Zephyr" // Natural sounding voice
                        }
                    }
                }
            }
        });

        // Extract audio data from response
        const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        console.log("Audio response:", JSON.stringify(audioResponse.candidates?.[0]?.content?.parts?.[0], null, 2));

        if (!audioData) {
            console.error("No audio data in response");
            return null;
        }

        console.log("Audio mimeType:", audioData.mimeType);
        console.log("Audio data length:", audioData.data?.length);

        return {
            text: explanationText,
            audioBase64: audioData.data || "",
            mimeType: audioData.mimeType || "audio/L16;rate=24000"
        };

    } catch (error: any) {
        console.error("Error generating audio explanation:", error);
        return null;
    }
};

// Convert PCM data to WAV format
const pcmToWav = (pcmData: Uint8Array, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): Uint8Array => {
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM data
    const uint8Array = new Uint8Array(buffer);
    uint8Array.set(pcmData, 44);

    return uint8Array;
};

// Convert base64 audio to blob URL for playback
export const createAudioBlobUrl = (base64Data: string, mimeType: string): string => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const pcmData = new Uint8Array(byteNumbers);

    // If it's PCM/L16 audio, convert to WAV
    if (mimeType.includes('L16') || mimeType.includes('pcm')) {
        // Extract sample rate from mimeType if present (e.g., "audio/L16;rate=24000")
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

        const wavData = pcmToWav(pcmData, sampleRate);
        const blob = new Blob([wavData], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }

    // For other formats, use as-is
    const blob = new Blob([pcmData], { type: mimeType });
    return URL.createObjectURL(blob);
};

// Generate audio explanation from PDF content
export const generateAudioFromPDF = async (
    pdfData: ArrayBuffer,
    onProgress?: (status: string) => void
): Promise<AudioExplanation | null> => {
    const ai = getClient();
    if (!ai) {
        console.error("API client not available");
        return null;
    }

    try {
        // Step 1: Extract and generate explanation from PDF
        onProgress?.("Analisando conteúdo do PDF...");

        // Convert ArrayBuffer to base64
        let binary = '';
        const bytes = new Uint8Array(pdfData);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const pdfBase64 = btoa(binary);

        const textResponse = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: 'application/pdf',
                                data: pdfBase64
                            }
                        },
                        { text: EXPLANATION_PROMPT + "\n\nAnalise o conteúdo deste PDF e gere uma explicação em áudio." }
                    ]
                }
            ],
            config: { temperature: 0.7 }
        });

        const explanationText = textResponse.text || "";

        if (!explanationText) {
            console.error("No explanation text generated from PDF");
            return null;
        }

        // Step 2: Generate audio from the explanation text
        onProgress?.("Sintetizando áudio...");

        const audioResponse = await ai.models.generateContent({
            model: TTS_MODEL_ID,
            contents: explanationText,
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Zephyr"
                        }
                    }
                }
            }
        });

        const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;

        if (!audioData) {
            console.error("No audio data in response");
            return null;
        }

        return {
            text: explanationText,
            audioBase64: audioData.data || "",
            mimeType: audioData.mimeType || "audio/L16;rate=24000"
        };

    } catch (error: any) {
        console.error("Error generating audio from PDF:", error);
        return null;
    }
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return "";

    try {
        const response = await ai.models.generateContent({
            model: getSelectedModel(),
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "Transcreva este áudio exatamente como falado. Não adicione comentários." },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: audioBase64
                            }
                        }
                    ]
                }
            ]
        });
        return response.text || "";
    } catch (error) {
        console.error("Transcription error:", error);
        return "";
    }
};
