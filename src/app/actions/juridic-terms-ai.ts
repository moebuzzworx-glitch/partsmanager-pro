'use server';

import { GoogleGenAI } from "@google/genai";

// Initialize the client
const genAI = process.env.GEMINI_CHAT_BOT
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_CHAT_BOT })
    : null;

const SYSTEM_INSTRUCTION = `
# System Prompt: Legal Terminology Specialist Agent

## Role
You are a **Legal Terminology Specialist** for a business invoicing system. Your goal is to process "Juridic Terms" (payment terms, legal disclaimers, conditions of sale) provided by the user.

## Task
1.  **Analyze**: The user will provide text in **Arabic** or **French**.
2.  **Enhance & Translate**: 
    -   Translate the text to **Professional Business French**.
    -   Enhance the wording to be legally sound, clear, concise, and professional.
    -   Ensure it sounds like standard "Conditions Générales de Vente" (General Terms of Sale) or "Conditions de Paiement" (Payment Terms).
3.  **Output**: Return ONLY the enhanced French text.

## Guidelines
-   If the input is informal, make it formal.
-   If the input is Arabic, translate it accurately to legal French.
-   Do not add conversational filler.
-   Do not wrap in markdown code blocks. Just return the raw string.
`;

export async function enhanceJuridicTerms(
    draftTerms: string
): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
        if (!genAI) {
            return { success: false, error: 'AI Service Not Initialized (Check Server Logs)' };
        }

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                role: 'user',
                parts: [{ text: draftTerms }]
            }],
            config: {
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                maxOutputTokens: 2048,
            }
        });

        let text = '';
        if (result && typeof (result as any).text === 'function') {
            text = (result as any).text();
        } else if (result && typeof (result as any).text === 'string') {
            text = (result as any).text;
        } else if (result && result.candidates && result.candidates.length > 0) {
            text = result.candidates[0].content?.parts?.[0]?.text || '';
        } else {
            return { success: false, error: 'Empty response from AI.' };
        }

        return { success: true, data: text.trim() };

    } catch (error: any) {
        console.error('AI Juridic Terms Error:', error);
        return { success: false, error: error.message || 'Failed to process terms' };
    }
}
