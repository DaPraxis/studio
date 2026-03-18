"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { explainDividendEvent, ExplainDividendEventInput } from "@/ai/flows/explain-dividend-event";

interface AIDividendExplainerProps {
  input: ExplainDividendEventInput;
}

export function AIDividendExplainer({ input }: AIDividendExplainerProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const result = await explainDividendEvent(input);
      setExplanation(result.explanation);
    } catch (error) {
      console.error("AI Explanation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          AI Dividend Insight
        </CardTitle>
        <CardDescription>
          Get context on this {input.eventType} event for {input.ticker}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {explanation ? (
          <div className="text-sm leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-500">
            {explanation}
            <Button 
              variant="link" 
              className="px-0 h-auto text-xs block mt-2" 
              onClick={() => setExplanation(null)}
            >
              Close Insight
            </Button>
          </div>
        ) : (
          <Button 
            onClick={handleExplain} 
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {loading ? "Analyzing..." : "Explain Event"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}