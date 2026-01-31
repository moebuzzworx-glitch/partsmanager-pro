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

**ALL The Things You Can Do (The Full Map!):**

**� DASHBOARD (The Home Screen):**
*   **Total Revenue:** The big number showing all money you made.
*   **Net Profit:** Your real profit (Money In minus Money Out).
*   **Today's Sales:** How many things you sold today.
*   **Products:** Shows total items. If you see numbers here, check if any are low!

**�📄 MAKING PAPERS (Invoices & More):**
*   **New Invoice:** Go to **Invoices** -> Click **Create Invoice** (Plus ➕). Use this to get money later.
*   **Delivery Note:** Go to **Invoices** -> Click **Create** -> Choose "Delivery Note". Use for shipping.
*   **Sales Receipt:** Go to **Invoices** -> Click **Create** -> Choose "Receipt". Quick cash sales.
*   **Purchase Order:** Go to **Invoices** -> Click **Create** -> Choose "Purchase Order". Order stock.

**📦 YOUR STUFF (Stock):**
*   **Add New Item:** Click **Stock** (Box 📦) -> Click **Add Product** -> Fill in details.
*   **Import Lots of Items:** Click **Stock** -> **Add Product** -> Click **Batch Import** tab. Upload Excel/CSV.
*   **Check Stock:** Click **Stock**. Red numbers mean "Buy more!".

**💰 BUYING & SELLING:**
*   **Sell Something:** Click **Sales** (Cart 🛒) -> Click **Log Sale** (or use Invoices).
*   **Buy Something:** Click **Purchases** (Building 🏢) -> Click **Log Purchase**. Adds to stock.

**👥 PEOPLE:**
*   **Customers:** Click **Customers** (People 👥) -> **Add Customer**.
*   **Suppliers:** Click **Suppliers** -> **Add Supplier**.

**⚙️ SETTINGS & MONEY:**
*   **My Subscription:** Click **Settings** (Gear ⚙️) or **Billing**. Pay for the app here.
*   **My Profile:** Click your name or **Settings** to change passwords.
*   **Roles:** Admins can change user permissions in Settings.

**🛠️ FIXING MISTAKES:**
*   **Edit:** Click the **Pencil Icon** ✏️ (or 3 dots ...) on any item to change it.
*   **Delete:** Click the **Trash Can** 🗑️ to remove something.
*   **Restore:** Did you delete by mistake? Go to **Trash** (Trash Icon 🗑️ in menu) to put it back!

**🚀 ADVANCED STUFF:**
*   **Export/Print:** Look for the **Export** or **Print** buttons on lists to save PDF/Excel.

**⚠️ HELP!:**
*   **Search:** Use the Search bar at the top to find things.
*   **Notifications:** Click the Bell 🔔 at the top for alerts.

**Support:** If you are REALLy stuck, call ${SUPPORT_NUMBER}.
**Phone Hours:** 9:00 AM to 5:00 PM (Every day EXCEPT Friday). Friday is closed! 🛑
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
                maxOutputTokens: 2048,
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
