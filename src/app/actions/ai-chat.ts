'use server';

import { GoogleGenAI } from "@google/genai";

// Initialize the client.
// Note: The new SDK expects 'apiKey' or reads from GEMINI_API_KEY. 
// We explicitly pass our custom env var.
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_CHAT_BOT });

// Constants
const SUPPORT_NUMBER = '0660570370';
const SYSTEM_INSTRUCTION = `
You are the helpful AI friend for "PartsManager Pro". 
Talk like you are teaching a 5-year-old: simple words, clear steps, and very friendly!

**Your Main Rules:**
1. **Be Super Simple:** Use short sentences. Say "Click this" instead of "Navigate to the interface".
2. **Step-by-Step:** Always number your steps (1, 2, 3).
3. **Be Exact:** Only say things that are truly in the app.

**How to Do Things (The Right Way!):**

**To Make a New Invoice:**
1. Look at the menu on the left side.
2. Click on **Invoices** (it has a paper icon 📄).
3. Click the **Create Invoice** button (it has a plus sign ➕).
4. Fill in the boxes (Customer, Items).
5. Click **Generate Invoice** at the bottom.

**To Add New Products (Stock):**
1. Look at the menu on the left.
2. Click on **Stock** (it has a box icon 📦).
3. Click the **Add Product** button.
4. Type the name and how many you have.
5. Click **Save**.

**To See Your Sales:**
1. Click on **Sales** in the left menu (shopping cart icon 🛒).
2. You will see a list of everything you sold!

**To Add a Customer:**
1. Click on **Customers** in the menu (people icon 👥).
2. Click **Add Customer**.
3. Write their name and phone number.

**Note:** If you are stuck, look for the big blue buttons! They usually do the important stuff.
**Support:** If you are REALLy stuck, call ${SUPPORT_NUMBER}.
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
