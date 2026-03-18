"use client"

import { useState } from 'react';
import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { History, ArrowUpRight, ArrowDownRight, Gift, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionType, DividendFrequency } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const { transactions, deleteTransaction, addTransaction, isLoaded } = usePortfolio();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    type: "buy" as TransactionType,
    date: format(new Date(), 'yyyy-MM-dd'),
    shares: 0,
    price: 0,
    totalAmount: 0,
    // Optional Div fields
    dividendAmount: 0,
    frequency: 'quarterly' as DividendFrequency,
    nextExDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleLogTransaction = () => {
    if (!formData.ticker || formData.shares < 0) return;
    
    const finalTotal = formData.totalAmount || (formData.shares * formData.price);
    
    addTransaction({
      ticker: formData.ticker.toUpperCase(),
      type: formData.type,
      date: formData.date,
      shares: Number(formData.shares),
      price: Number(formData.price),
      totalAmount: Number(finalTotal),
      dividendAmount: (formData.type === 'buy' || formData.type === 'dividend') ? Number(formData.dividendAmount) : undefined,
      frequency: formData.type === 'buy' ? formData.frequency : undefined,
      nextExDate: formData.type === 'buy' ? formData.nextExDate : undefined
    });
    
    setIsAddOpen(false);
    setFormData({
      ticker: "",
      type: "buy",
      date: format(new Date(), 'yyyy-MM-dd'),
      shares: 0,
      price: 0,
      totalAmount: 0,
      dividendAmount: 0,
      frequency: 'quarterly',
      nextExDate: format(new Date(), 'yyyy-MM-dd')
    });
  };

  if (!isLoaded) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Activity History</h1>
          <p className="text-muted-foreground">Log transactions to automatically update your portfolio and projections.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Log Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Transaction</DialogTitle>
              <DialogDescription>A "Buy" will update or create a portfolio entry with the provided dividend info.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Ticker</Label>
                  <Input 
                    placeholder="AAPL" 
                    value={formData.ticker} 
                    onChange={e => setFormData(prev => ({ ...prev, ticker: e.target.value }))} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v: TransactionType) => setFormData(prev => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                      <SelectItem value="dividend">Dividend</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Total Shares</Label>
                  <Input 
                    type="number" 
                    value={formData.shares} 
                    onChange={e => setFormData(prev => ({ ...prev, shares: Number(e.target.value) }))} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{formData.type === 'dividend' ? 'Amount / Share' : 'Price / Share'}</Label>
                  <Input 
                    type="number" 
                    step="0.001" 
                    value={formData.price} 
                    onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Total Value</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder={(formData.shares * formData.price).toFixed(2)}
                    value={formData.totalAmount || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, totalAmount: Number(e.target.value) }))} 
                  />
                </div>
              </div>

              {(formData.type === 'buy' || formData.type === 'dividend') && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold text-sm text-accent flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Dividend Adjustment
                  </h4>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Current Dividend Amount (Per Share)</Label>
                      <Input 
                        type="number" 
                        step="0.001" 
                        value={formData.dividendAmount} 
                        onChange={e => setFormData(prev => ({ ...prev, dividendAmount: Number(e.target.value) }))} 
                      />
                    </div>
                    {formData.type === 'buy' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Frequency</Label>
                          <Select 
                            value={formData.frequency} 
                            onValueChange={(v: DividendFrequency) => setFormData(prev => ({ ...prev, frequency: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="semi-monthly">Semi-Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annually">Annually</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Next Ex-Date</Label>
                          <Input 
                            type="date" 
                            value={formData.nextExDate} 
                            onChange={e => setFormData(prev => ({ ...prev, nextExDate: e.target.value }))} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleLogTransaction}>Save & Update Portfolio</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              {transactions.slice().reverse().map((t) => (
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
                    t.type === 'sell' ? "text-green-600" : (t.type === 'dividend' ? "text-accent" : "text-primary")
                  )}>
                    {t.type === 'dividend' || t.type === 'sell' ? `+` : `-`}${t.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    No transactions found. Log a buy to start.
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
