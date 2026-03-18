"use client"

import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { History, ArrowUpRight, ArrowDownRight, Gift, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HistoryPage() {
  const { transactions, deleteTransaction, isLoaded } = usePortfolio();

  if (!isLoaded) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Activity History</h1>
          <p className="text-muted-foreground">A record of your portfolio changes and received dividends.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Ticker</TableHead>
                <TableHead className="font-bold">Type</TableHead>
                <TableHead className="font-bold">Shares</TableHead>
                <TableHead className="font-bold text-right">Total Amount</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground font-medium">{format(new Date(t.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="font-bold text-primary">{t.ticker}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {t.type === 'buy' && <ArrowUpRight className="h-4 w-4 text-green-600" />}
                      {t.type === 'sell' && <ArrowDownRight className="h-4 w-4 text-red-600" />}
                      {t.type === 'dividend' && <Gift className="h-4 w-4 text-accent" />}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "capitalize",
                          t.type === 'buy' && "border-green-200 text-green-700 bg-green-50",
                          t.type === 'sell' && "border-red-200 text-red-700 bg-red-50",
                          t.type === 'dividend' && "border-accent/20 text-accent bg-accent/5"
                        )}
                      >
                        {t.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{t.shares}</TableCell>
                  <TableCell className={cn(
                    "text-right font-bold",
                    t.type === 'sell' || t.type === 'buy' ? "text-primary" : "text-accent"
                  )}>
                    {t.type === 'dividend' ? `+` : ``}${t.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteTransaction(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    No transactions found.
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

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
