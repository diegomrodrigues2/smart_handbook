/**
 * Service for handling PDF content for LLM interactions.
 * Converts PDF files to base64 and creates attachment objects for the Gemini API.
 */

/**
 * Represents a PDF attachment for the Gemini API
 */
export interface PDFAttachment {
    inlineData: {
        data: string;
        mimeType: 'application/pdf';
    };
}

/**
 * Represents the content parts format for the Gemini API
 */
export interface ContentWithPDF {
    text?: string;
    inlineData?: {
        data: string;
        mimeType: string;
    };
}

/**
 * Converts an ArrayBuffer to a base64 string
 */
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

/**
 * Creates a PDF attachment object for the Gemini API from an ArrayBuffer
 */
export const createPDFAttachment = (pdfData: ArrayBuffer): PDFAttachment => {
    const base64Data = arrayBufferToBase64(pdfData);
    return {
        inlineData: {
            data: base64Data,
            mimeType: 'application/pdf'
        }
    };
};

/**
 * Creates content parts array for Gemini API with PDF attachment and optional text
 */
export const createContentWithPDF = (
    pdfData: ArrayBuffer,
    prompt: string
): ContentWithPDF[] => {
    return [
        {
            inlineData: {
                data: arrayBufferToBase64(pdfData),
                mimeType: 'application/pdf'
            }
        },
        {
            text: prompt
        }
    ];
};

/**
 * Type guard to check if content source is PDF data
 */
export const isPDFContent = (content: string | ArrayBuffer): content is ArrayBuffer => {
    return content instanceof ArrayBuffer;
};
