'use server';
/**
 * @fileOverview An AI assistant that provides concise explanations for specific dividend events.
 *
 * - explainDividendEvent - A function that handles the explanation of a dividend event.
 * - ExplainDividendEventInput - The input type for the explainDividendEvent function.
 * - ExplainDividendEventOutput - The return type for the explainDividendEvent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExplainDividendEventInputSchema = z.object({
  ticker: z.string().describe('The stock ticker symbol (e.g., AAPL).'),
  eventType: z.enum(['ex-dividend', 'record', 'payout']).describe('The type of dividend event (ex-dividend, record, or payout).'),
  eventDate: z.string().describe('The date of the dividend event in YYYY-MM-DD format.'),
  dividendAmountPerShare: z.number().describe('The dividend amount per share for this event.'),
  sharesOwned: z.number().describe('The number of shares owned by the user for this stock.'),
  totalDividendAmount: z.number().describe('The calculated total dividend amount for the user\u0027s position for this event.'),
});
export type ExplainDividendEventInput = z.infer<typeof ExplainDividendEventInputSchema>;

const ExplainDividendEventOutputSchema = z.object({
  explanation: z.string().describe('A concise, easy-to-understand explanation of the dividend event.'),
});
export type ExplainDividendEventOutput = z.infer<typeof ExplainDividendEventOutputSchema>;

export async function explainDividendEvent(input: ExplainDividendEventInput): Promise<ExplainDividendEventOutput> {
  return explainDividendEventFlow(input);
}

const explainDividendEventPrompt = ai.definePrompt({
  name: 'explainDividendEventPrompt',
  input: { schema: ExplainDividendEventInputSchema },
  output: { schema: ExplainDividendEventOutputSchema },
  prompt: `You are an AI financial assistant specializing in explaining dividend events. Provide a concise, easy-to-understand explanation for the following dividend event, avoiding financial jargon.

Here are the details of the event:
- Stock Ticker: {{{ticker}}}
- Event Type: {{{eventType}}}
- Event Date: {{{eventDate}}}
- Dividend Amount Per Share: {{{dividendAmountPerShare}}}
- Shares Owned: {{{sharesOwned}}}
- Total Dividend Amount for your position: {{{totalDividendAmount}}}

Explain what this event means for the investor, considering the provided details. Focus on clarity and practical implications.`,
});

const explainDividendEventFlow = ai.defineFlow(
  {
    name: 'explainDividendEventFlow',
    inputSchema: ExplainDividendEventInputSchema,
    outputSchema: ExplainDividendEventOutputSchema,
  },
  async (input) => {
    const { output } = await explainDividendEventPrompt(input);
    return output!;
  }
);
