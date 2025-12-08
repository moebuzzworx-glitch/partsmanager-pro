'use server';

/**
 * @fileOverview This file defines a Genkit flow for automatically adjusting stock levels based on a supplier's product list.
 *
 * - `automaticStockAdjustment`: An asynchronous function that triggers the stock adjustment flow.
 * - `AutomaticStockAdjustmentInput`: The input type for the `automaticStockAdjustment` function, representing the supplier's product list.
 * - `AutomaticStockAdjustmentOutput`: The output type for the `automaticStockAdjustment` function, detailing the stock adjustments made.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomaticStockAdjustmentInputSchema = z.object({
  supplierProductList: z
    .string()
    .describe("The supplier's product list, including product names and quantities."),
});
export type AutomaticStockAdjustmentInput = z.infer<
  typeof AutomaticStockAdjustmentInputSchema
>;

const StockAdjustmentSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  quantityChange: z.number().describe('The change in quantity (positive or negative).'),
  reason: z.string().describe('The reason for the stock adjustment.'),
});

const AutomaticStockAdjustmentOutputSchema = z.object({
  adjustments: z.array(StockAdjustmentSchema).describe('A list of stock adjustments to be made.'),
});
export type AutomaticStockAdjustmentOutput = z.infer<
  typeof AutomaticStockAdjustmentOutputSchema
>;

export async function automaticStockAdjustment(
  input: AutomaticStockAdjustmentInput
): Promise<AutomaticStockAdjustmentOutput> {
  return automaticStockAdjustmentFlow(input);
}

const automaticStockAdjustmentPrompt = ai.definePrompt({
  name: 'automaticStockAdjustmentPrompt',
  input: {schema: AutomaticStockAdjustmentInputSchema},
  output: {schema: AutomaticStockAdjustmentOutputSchema},
  prompt: `You are an inventory management expert.

  Based on the following supplier product list, determine the necessary stock adjustments.
  Provide a JSON array of adjustments, including the product name, quantity change, and reason for the adjustment.
  Consider current stock levels and potential discrepancies.

  Supplier Product List:
  {{supplierProductList}}
  `,
});

const automaticStockAdjustmentFlow = ai.defineFlow(
  {
    name: 'automaticStockAdjustmentFlow',
    inputSchema: AutomaticStockAdjustmentInputSchema,
    outputSchema: AutomaticStockAdjustmentOutputSchema,
  },
  async input => {
    const {output} = await automaticStockAdjustmentPrompt(input);
    return output!;
  }
);
