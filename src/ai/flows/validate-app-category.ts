
'use server';

/**
 * @fileOverview Validates if an app description matches its assigned category using GenAI.
 *
 * - validateAppCategory - A function that handles the app category validation process.
 * - ValidateAppCategoryInput - The input type for the validateAppCategory function.
 * - ValidateAppCategoryOutput - The return type for the validateAppCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateAppCategoryInputSchema = z.object({
  app: z.string().describe('The name of the app.'),
  description: z.string().describe('The description of the app.'),
  category: z.string().describe('The assigned category of the app.'),
});
export type ValidateAppCategoryInput = z.infer<typeof ValidateAppCategoryInputSchema>;

const ValidateAppCategoryOutputSchema = z.object({
  isValidCategory: z.boolean().describe('Whether the description matches the category.'),
  validationReason: z.string().describe('The reason for the validation result.'),
});
export type ValidateAppCategoryOutput = z.infer<typeof ValidateAppCategoryOutputSchema>;

export async function validateAppCategory(input: ValidateAppCategoryInput): Promise<ValidateAppCategoryOutput> {
  return validateAppCategoryFlow(input);
}

const validateCategoryPrompt = ai.definePrompt({
  name: 'validateCategoryPrompt',
  input: {schema: ValidateAppCategoryInputSchema},
  output: {schema: ValidateAppCategoryOutputSchema},
  prompt: `You are an expert app category validator.

You will determine if the provided app description accurately reflects the assigned category.

App: {{{app}}}
Description: {{{description}}}
Category: {{{category}}}

Determine if the description is appropriate for the category. Return a reason for your decision.
Set isValidCategory to true if it is a valid category, otherwise set to false.

Specific Category Rules:
- If the Category is "Microlending", the app description MUST explicitly state that users can take out loans or borrow money. If it does not, it is not a valid "Microlending" app.
`,
});

const validateAppCategoryFlow = ai.defineFlow(
  {
    name: 'validateAppCategoryFlow',
    inputSchema: ValidateAppCategoryInputSchema,
    outputSchema: ValidateAppCategoryOutputSchema,
  },
  async input => {
    const {output} = await validateCategoryPrompt(input);
    return output!;
  }
);

