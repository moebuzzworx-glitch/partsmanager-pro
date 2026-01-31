'use server';

import { GoogleGenAI } from "@google/genai";

// Initialize the client.
// Note: The new SDK expects 'apiKey' or reads from GEMINI_API_KEY. 
// We explicitly pass our custom env var.
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_CHAT_BOT });

// Constants
const SUPPORT_NUMBER = '0660570370';
const SYSTEM_INSTRUCTION = `
You are the expert AI Assistant for "PartsManager Pro", a comprehensive stock and business management application.
Your goal is to guide users, explain feature, and help them navigate the app.

**Key Information:**
- **App Name:** PartsManager Pro
- **Support Contact:** ${SUPPORT_NUMBER} (Provide this only when the user explicitly asks for human support or if you cannot solve a critical issue).
- **Tone:** Professional, friendly, helpful, and concise.
- **Language:** RESPOND IN THE SAME LANGUAGE AS THE USER'S INPUT (English, French, or Arabic).

**App Capabilities (Manual Context):**
1. **Dashboard:** Overview of sales, stock, and profits.
2. **Inventory/Stock:** Manage products, categories, suppliers. Update quantities.
3. **Sales:** Create invoices, manage customers.
4. **CRM:** Customer Relationship Management.
5. **Settings:** Configure user roles, notifications, and app preferences.
6. **Notifications:** Alerts for low stock, orders, etc.

**Rules:**
- Do NOT make up features that don't exist.
- If unsure, suggest checking the "Settings" or contacting support.
- Be brief. Users are working and need quick answers.
- Use simple formatting (bullet points) if explaining a process.
`;

export type ChatResponse = {
    success: boolean;
    message?: string;
    error?: string;
};

export async function sendChatMessage(history: { role: 'user' | 'model'; parts: string }[], newMessage: string): Promise<ChatResponse> {
    try {
        if (!process.env.GEMINI_CHAT_BOT) {
            return { success: false, error: 'AI Service Pending Configuration (Missing API Key)' };
        }

        // Mapping history to 'contents' for the new SDK
        // The new SDK format for generateContent with history is effectively a list of content objects.
        const contents = history.map(msg => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.parts }]
        }));

        // Add the new message
        contents.push({
            role: 'user',
            parts: [{ text: newMessage }]
        });

        // Using 'gemini-2.5-flash' as explicitly requested by the user.
        const result = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                maxOutputTokens: 500,
            }
        });

        // Robustly handle response parsing
        let text = '';
        // @ts-ignore
        if (result && typeof result.text === 'function') {
            // @ts-ignore
            text = result.text();
            // @ts-ignore
        } else if (result && typeof result.text === 'string') {
            // @ts-ignore
            text = result.text;
            // @ts-ignore
        } else if (result && result.candidates && result.candidates.length > 0) {
            // @ts-ignore
            text = result.candidates[0].content?.parts?.[0]?.text || '';
        } else {
            console.warn("Gemini Response Structure Unknown:", JSON.stringify(result, null, 2));
            text = "Received empty response from AI.";
        }

        return { success: true, message: text };
    } catch (error: any) {
        console.error('Gemini Chat Error:', error);
        return {
            success: false,
            error: error.message || 'I am having trouble connecting to the AI service.'
        };
    }
}
