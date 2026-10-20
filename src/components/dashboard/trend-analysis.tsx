
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BrainCircuit, Loader2, AlertCircle, ThumbsUp, Activity } from 'lucide-react';
import { getAITrendAnalysis } from '@/app/actions';
import type { ServiceCategory } from '@/data/mock-data'; // Updated import
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TrendAnalysisProps {
  metricsData: ServiceCategory[] | null; // Updated to use ServiceCategory array
  sourceFileName?: string | null;
}

interface AnalysisResultType {
  summary: string;
  categorySpecificInsights?: Array<{
    categoryId: string;
    categoryName: string;
    insight: string;
  }>;
}

export function TrendAnalysis({ metricsData, sourceFileName }: TrendAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'live' | 'demo' | null>(null);
  const [lastAnalyzedFile, setLastAnalyzedFile] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (sourceFileName !== lastAnalyzedFile) {
      setAnalysisResult(null);
      setError(null);
    }
  }, [metricsData, sourceFileName, lastAnalyzedFile]);

  const handleAnalyzeTrends = async () => {
    if (!metricsData || metricsData.length === 0) {
      setError("No data available to analyze. Please ensure data is loaded in the dashboard.");
      toast({
        variant: "destructive",
        title: "Analysis Error",
        description: "No data available to analyze.",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // The action now expects the direct ServiceCategory[] array.
      // JSON.stringify will happen inside the action or the Genkit flow.
      const result = await getAITrendAnalysis(metricsData, sourceFileName);

      if (!result.ok) {
        setError(result.error);
        toast({ variant: "destructive", title: "Analysis Failed", description: result.error });
      } else {
        setAnalysisResult(result.data.analysis);
        setMode(result.data.mode);
        setLastAnalyzedFile(sourceFileName || null);
        toast({
          title: "Analysis Complete",
          description: result.data.mode === 'demo'
            ? "Rule-based demo summary generated (no AI key configured)."
            : `AI insights for ${sourceFileName || 'current data'} generated.`,
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI analysis.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Analysis Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="gradient-ring overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-lg shadow-primary/30">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
          </span>
          <CardTitle>AI-Powered Trend Analysis</CardTitle>
        </div>
        <CardDescription>
          {sourceFileName ? `Generate insights for data from ${sourceFileName}. ` : `Generate insights for current data. `}
          Click the button to use AI. The AI will analyze all loaded health categories and indicators.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!metricsData && !isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Data Required</AlertTitle>
              <AlertDescription>
                No dashboard data loaded. Analysis cannot be performed.
              </AlertDescription>
            </Alert>
        )}
        {isLoading && (
          <div role="status" aria-live="polite" className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary motion-reduce:animate-none" />
            <p className="text-muted-foreground">Analyzing comprehensive health data, please wait...</p>
            <p className="text-xs text-muted-foreground">(This may take a moment depending on data complexity)</p>
          </div>
        )}
        {error && !isLoading && metricsData && (
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error Generating Analysis</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
           </Alert>
        )}
        {analysisResult && !isLoading && metricsData && (
          <div className="space-y-4">
            {mode === 'demo' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Demo mode</AlertTitle>
                <AlertDescription>
                  No Gemini API key is configured, so this is a rule-based summary rather than AI output.
                </AlertDescription>
              </Alert>
            )}
            <div className="max-w-none rounded-xl border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Activity size={20} /> Overall Summary {sourceFileName && `for ${sourceFileName}`}:
              </h3>
              <p className="text-foreground whitespace-pre-wrap">{analysisResult.summary}</p>
            </div>

            {analysisResult.categorySpecificInsights && analysisResult.categorySpecificInsights.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">Category-Specific Insights:</h3>
                <Accordion type="single" collapsible className="w-full">
                  {analysisResult.categorySpecificInsights.map((catInsight, index) => (
                    <AccordionItem value={`item-${index}`} key={catInsight.categoryId}>
                      <AccordionTrigger className="text-base hover:no-underline">
                        <div className="flex items-center gap-2">
                           {/* Consider adding category icons here if available/mapped */}
                          {catInsight.categoryName}
                        </div>
                        </AccordionTrigger>
                      <AccordionContent className="max-w-none pb-3 pt-1">
                        <p className="text-foreground whitespace-pre-wrap">{catInsight.insight}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
             {!analysisResult.categorySpecificInsights?.length && (
                 <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                     No specific additional insights highlighted per category in this analysis. The overall summary covers key points.
                 </div>
             )}
          </div>
        )}
        {!analysisResult && !isLoading && !error && metricsData && (
          <div className="rounded-xl border-2 border-dashed px-4 py-8 text-center text-muted-foreground">
            <ThumbsUp className="h-10 w-10 mx-auto mb-3 text-primary" />
            <p className="font-semibold">Ready for Analysis</p>
            <p className="text-sm">
              Click the button below to generate an AI analysis of the current health dashboard data
              {sourceFileName && ` from ${sourceFileName}`}.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAnalyzeTrends} 
          disabled={isLoading || !metricsData || metricsData.length === 0} 
          size="lg" 
          className="h-auto min-h-11 w-full whitespace-normal py-2.5 text-center md:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing All Health Data...
            </>
          ) : (
            <>
              <BrainCircuit className="mr-2 h-4 w-4" />
              Generate Full Dashboard Analysis {sourceFileName && `for ${sourceFileName}`}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

    