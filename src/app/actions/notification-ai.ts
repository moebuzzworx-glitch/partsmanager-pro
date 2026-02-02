'use server';

import { GoogleGenAI } from "@google/genai";

// Initialize the client exactly as ai-chat.ts does
const genAI = process.env.GEMINI_CHAT_BOT
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_CHAT_BOT })
    : null;

// System Instruction from AI_AGENT_PROMPT.md
const SYSTEM_INSTRUCTION = `
# System Prompt: Notification Specialist Agent (JSON Mode)

## Role
You are the **Notification Specialist Agent** for a professional inventory management system. Your goal is process draft notifications by enhancing the English text and providing accurate translations in French and Arabic.

## Input Format
You will receive a JSON object containing the draft content.

## Task Instructions
1.  **Enhance (English)**: Rewrite the title and message to be professional, engaging, clear, and concise.
2.  **Translate (French)**: Translate the *enhanced* English content into professional business French.
3.  **Translate (Arabic)**: Translate the *enhanced* English content into formal business Arabic.

## Output Format
You must respond with a **Single Valid JSON Object**. Do not include markdown formatting (like \`\`\`json ... \`\`\`) or conversational text.

{
  "en": {
    "title": "Enhanced English Title",
    "message": "Enhanced English Message"
  },
  "fr": {
    "title": "Titre en Français",
    "message": "Message en Français"
  },
  "ar": {
    "title": "العنوان بالعربية",
    "message": "الرسالة بالعربية"
  }
}

## Guidelines
*   **Tone**: Corporate, Professional, Helpful.
*   **Structure**: Ensure the JSON is strictly valid.
`;

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
        // Double check API Key at runtime in case it changed (though global init is used above)
        // If global init failed, we can't recover easily unless we re-init.
        if (!genAI) {
            const runtimeKey = process.env.GEMINI_CHAT_BOT;
            if (!runtimeKey) {
                return { success: false, error: 'AI Service Pending Configuration (Missing API Key)' };
            }
            // Fallback: try creating a local instance if global failed initially
            // const localGenAI = new GoogleGenAI({ apiKey: runtimeKey });
            // For now, fail if global is null as per ai-chat.ts pattern
            return { success: false, error: 'AI Service Not Initialized (Check Server Logs)' };
        }

        const userPayload = JSON.stringify({
            draft_title: title,
            draft_message: message
        });

        const contents = [
            {
                role: 'user',
                parts: [{ text: userPayload }]
            }
        ];

        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                maxOutputTokens: 2048,
            }
        });

        let text = '';
        // @ts-ignore
        if (result && typeof result.text === 'function') {
            // @ts-ignore
            text = result.text();
            // @ts-ignore
        } else if (result && typeof result.text === 'string') {
            // @ts-ignore
            text = result.text;
        } else if (result && result.candidates && result.candidates.length > 0) {
            // @ts-ignore
            text = result.candidates[0].content?.parts?.[0]?.text || '';
        } else {
            console.warn("Gemini Response Structure Unknown:", JSON.stringify(result, null, 2));
            // @ts-ignore
            const finishReason = result?.response?.candidates?.[0]?.finishReason;
            return { success: false, error: `Empty response from AI. Status: ${finishReason || 'Unknown'}` };
        }

        console.log('[AI Debug] Raw Response:', text);

        const cleanJson = text.replace(/^```json/g, '').replace(/^```/g, '').replace(/```$/g, '').trim();

        try {
            const data = JSON.parse(cleanJson) as EnhancedNotification;
            return { success: true, data };
        } catch (jsonError) {
            console.error('[AI Parse Error]', jsonError);
            return { success: false, error: 'AI response was not valid JSON.' };
        }

    } catch (error: any) {
        console.error('AI Notification Error:', error);

        // Return raw error for debugging
        if (error.message?.includes('429') || error.message?.includes('Quota') || error.status === 429) {
            return { success: false, error: `Google API Error: ${error.message}` };
        }

        return { success: false, error: error.message || 'Failed to process notification' };
    }
}
