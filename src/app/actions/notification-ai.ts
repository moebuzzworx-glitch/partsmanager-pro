'use server';

import { GoogleGenAI } from "@google/genai";

const genAI = process.env.GEMINI_CHAT_BOT
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_CHAT_BOT })
    : null;

export type EnhancedNotification = {
    en: { title: string; message: string };
    fr: { title: string; message: string };
    ar: { title: string; message: string };
};

export async function enhanceAndTranslateNotification(
    title: string,
    message: string
): Promise<{ success: boolean; data?: EnhancedNotification; error?: string }> {
    try {
        if (!genAI) {
            return { success: false, error: 'AI Service Pending Configuration (Missing API Key)' };
        }

        const prompt = `
      You are a professional business assistant. 
      1. Enhance the following notification title and message for a professional, clear, and engaging tone (in English).
      2. Translate the *enhanced* version into French and Arabic.
      
      Input Title: "${title}"
      Input Message: "${message}"

      Return ONLY valid JSON in the following format (no markdown code blocks):
      {
        "en": { "title": "...", "message": "..." },
        "fr": { "title": "...", "message": "..." },
        "ar": { "title": "...", "message": "..." }
      }
    `;

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
            }
        });

        let text = '';
        // @ts-ignore
        if (result && typeof result.text === 'function') {
            // @ts-ignore
            text = result.text();
        }
        // @ts-ignore
        else if (result && result.response && typeof result.response.text === 'function') {
            // @ts-ignore
            text = result.response.text();
        }

        if (text) {
            // Clean up markdown if model adds it despite instructions
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            const data = JSON.parse(text) as EnhancedNotification;
            return { success: true, data };
        }

        return { success: false, error: 'No response from AI' };

    } catch (error: any) {
        console.error('AI Notification Error:', error);
        return { success: false, error: error.message || 'Failed to process notification' };
    }
}
