
"use client"

import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Award, ArrowUpRight } from "lucide-react";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export default function Portfolio() {
  const { positions, getAllDividends, isLoaded } = usePortfolio();

  if (!isLoaded) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading Portfolio...</div>;

  const allDivs = getAllDividends();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthIncome = allDivs
    .filter(d => {
      const pDate = parseISO(d.payoutDate);
      return pDate >= monthStart && pDate <= monthEnd;
    })
    .reduce((acc, d) => acc + (Number(d.totalAmount) || 0), 0);

  const totalCost = positions.reduce((acc, p) => acc + (Number(p.totalCost) || 0), 0);
  
  const annualIncome = positions.reduce((acc, p) => {
    const multi = p.frequency === 'monthly' ? 12 : p.frequency === 'quarterly' ? 4 : p.frequency === 'semi-monthly' ? 24 : 1;
    return acc + (p.shares * p.dividendAmount * multi);
  }, 0);

  const avgYield = totalCost > 0 ? (annualIncome / totalCost) * 100 : 0;

  const topContributor = positions.length > 0 ? positions.reduce((prev, current) => {
    const getAnnual = (pos: typeof positions[0]) => {
      const m = pos.frequency === 'monthly' ? 12 : pos.frequency === 'quarterly' ? 4 : pos.frequency === 'semi-monthly' ? 24 : 1;
      return pos.shares * pos.dividendAmount * m;
    };
    return getAnnual(prev) > getAnnual(current) ? prev : current;
  }, positions[0]) : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Portfolio Summary</h1>
          <p className="text-muted-foreground">Detailed breakdown of your active holdings and yields.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Expected (Current Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${thisMonthIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cash arriving this month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Avg. Yield (YoC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {avgYield.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Weighted by invested capital</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top Income Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topContributor ? topContributor.ticker : "---"}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {topContributor ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  Highest annual contributor
                </>
              ) : "Add positions to track"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Ticker</TableHead>
                <TableHead className="font-bold">Shares</TableHead>
                <TableHead className="font-bold">Avg. Cost</TableHead>
                <TableHead className="font-bold">Total Cost</TableHead>
                <TableHead className="font-bold">Current Div</TableHead>
                <TableHead className="font-bold">Next Ex-Date</TableHead>
                <TableHead className="font-bold">Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((pos) => (
                <TableRow key={pos.ticker}>
                  <TableCell className="font-bold text-primary">{pos.ticker}</TableCell>
                  <TableCell className="font-medium">{pos.shares}</TableCell>
                  <TableCell>${pos.averagePrice.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">${pos.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-accent font-bold">${pos.dividendAmount.toFixed(3)}</TableCell>
                  <TableCell>{pos.nextExDate}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{pos.frequency.replace('-', ' ')}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {positions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                    No active positions. Log a "Buy" in History to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
