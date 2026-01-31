'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_CHAT_BOT || '');

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
            return { success: false, error: 'AI Service Pending Configuration' };
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-pro',
            systemInstruction: SYSTEM_INSTRUCTION
        });

        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.parts }]
            })),
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessage(newMessage);
        const response = result.response;
        const text = response.text();

        return { success: true, message: text };
    } catch (error: any) {
        console.error('Gemini Chat Error:', error);
        return { success: false, error: 'I am having trouble connecting to the mainframe. Please try again.' };
    }
}
