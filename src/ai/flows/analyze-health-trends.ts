
// src/ai/flows/analyze-health-trends.ts
// Server-only module: imported by the `getAITrendAnalysis` server action. It is deliberately
// not a "use server" file (those may only export async functions).

/**
 * @fileOverview A flow for analyzing health trends from a comprehensive public health dashboard data structure.
 *
 * - analyzeHealthTrends - A function that accepts structured public health data and generates a summary of key trends and insights.
 * - AnalyzeHealthTrendsInput - The input type for the analyzeHealthTrends function.
 * - AnalyzeHealthTrendsOutput - The return type for the analyzeHealthTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the AI flow - expects the entire dashboard data as a JSON string.
// The client will stringify the `ServiceCategory[]` array.
const AnalyzeHealthTrendsInputSchema = z.object({
  healthDashboardJsonData: z
    .string()
    .describe(
      'A JSON string representing the entire public health dashboard data. This string should be an array of ServiceCategory objects, where each category contains an array of Indicator objects.'
    ),
  sourceFileName: z.string().optional().describe("The name of the file or data source, if applicable (e.g., 'Default System Data', 'uploaded_data.csv').")
});
export type AnalyzeHealthTrendsInput = z.infer<typeof AnalyzeHealthTrendsInputSchema>;

const AnalyzeHealthTrendsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of key trends, significant changes, actionable insights, and potential areas of concern or excellence from the provided public health dashboard data. Mention the source file if provided.'),
  categorySpecificInsights: z.array(z.object({
    categoryId: z.string(),
    categoryName: z.string(),
    insight: z.string(),
  })).optional().describe("Specific insights for each major health service category, if notable trends are found."),
}).describe("The AI-generated analysis of public health trends.");
export type AnalyzeHealthTrendsOutput = z.infer<typeof AnalyzeHealthTrendsOutputSchema>;

export async function analyzeHealthTrends(input: AnalyzeHealthTrendsInput): Promise<AnalyzeHealthTrendsOutput> {
  return analyzeHealthTrendsFlow(input);
}

const analyzeHealthTrendsPrompt = ai.definePrompt({
  name: 'analyzePublicHealthDashboardPrompt',
  input: {schema: AnalyzeHealthTrendsInputSchema}, 
  output: {schema: AnalyzeHealthTrendsOutputSchema},
  prompt: `You are an expert public health analyst AI. You have been provided with comprehensive public health dashboard data as a JSON string.
This JSON string represents an array of health service categories. Each category has a name, an optional description, and a list of detailed performance indicators.
Each indicator includes: its name, current value, unit, previous value, target value, status (good, neutral, bad, data_unavailable), trend (up, down, stable), historical trend data, a description, last updated date, source, and actionable notes.

Data Source: {{#if sourceFileName}}Data is from '{{{sourceFileName}}}'.{{else}}Data source is not specified.{{/if}}

Your task is to perform a thorough analysis of this data and provide:
1.  **Overall Summary:** A concise overview of the most critical trends, significant positive or negative changes across all categories, and any overarching actionable insights or areas requiring immediate attention.
2.  **Category-Specific Insights (Optional):** For major health service categories where significant trends or issues are identified, provide a brief insight. Focus on 2-3 key categories if multiple have insights.

When analyzing:
- Identify key trends for important indicators within each category (e.g., is immunization coverage improving or declining? Are NCD screening rates meeting targets?).
- Note significant changes between current and previous values, and compare current values against targets.
- Consider the 'status' and 'trend' fields for each indicator.
- Synthesize information to highlight interdependencies or broader public health implications if apparent.
- Focus on actionable insights. For example, if a communicable disease incidence is rising despite interventions, or if RMNCH+A indicators are consistently below target.
- Be specific where possible, mentioning indicator names and their values/trends to support your analysis.

Public Health Dashboard Data (JSON String):
{{{healthDashboardJsonData}}}

Please structure your output according to the 'AnalyzeHealthTrendsOutputSchema'. The overall summary is mandatory. Category-specific insights are optional but highly encouraged if relevant.
Provide a professional, data-driven, and insightful analysis.
`,
});

const analyzeHealthTrendsFlow = ai.defineFlow(
  {
    name: 'analyzeHealthTrendsFlow',
    inputSchema: AnalyzeHealthTrendsInputSchema,
    outputSchema: AnalyzeHealthTrendsOutputSchema,
  },
  async (input) => {
    const {output} = await analyzeHealthTrendsPrompt(input); // Pass the raw input which includes the JSON string
    
    if (!output) {
      throw new Error("AI analysis did not produce an output.");
    }
    return output;
  }
);

// To test or use this flow, you would call `analyzeHealthTrends` with an object like:
// {
//   healthDashboardJsonData: JSON.stringify(your_array_of_ServiceCategory_objects),
//   sourceFileName: "Example Data Set"
// }

    