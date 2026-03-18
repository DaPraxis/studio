
"use client"

import { useState } from 'react';
import { usePortfolio } from "@/hooks/use-portfolio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, Loader2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { DividendFrequency, PortfolioPosition } from '@/lib/types';

export default function Portfolio() {
  const { positions, addPosition, updatePosition, deletePosition, isLoaded } = usePortfolio();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<PortfolioPosition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form State
  const [formData, setFormData] = useState({
    ticker: "",
    shares: 0,
    purchasePrice: 0,
    dividendAmount: 0,
    frequency: 'quarterly' as DividendFrequency,
    nextExDate: format(new Date(), 'yyyy-MM-dd')
  });

  if (!isLoaded) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading Portfolio...</div>;

  const filteredPositions = positions.filter(p => 
    p.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      ticker: "",
      shares: 0,
      purchasePrice: 0,
      dividendAmount: 0,
      frequency: 'quarterly',
      nextExDate: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleAdd = () => {
    if (!formData.ticker || formData.shares <= 0) return;
    addPosition({
      ticker: formData.ticker.toUpperCase(),
      shares: Number(formData.shares),
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      purchasePrice: Number(formData.purchasePrice),
      dividendAmount: Number(formData.dividendAmount),
      frequency: formData.frequency,
      nextExDate: formData.nextExDate
    });
    resetForm();
    setIsAddOpen(false);
  };

  const handleUpdate = () => {
    if (!editingPos) return;
    updatePosition(editingPos.id, {
      ticker: formData.ticker.toUpperCase(),
      shares: Number(formData.shares),
      purchasePrice: Number(formData.purchasePrice),
      dividendAmount: Number(formData.dividendAmount),
      frequency: formData.frequency,
      nextExDate: formData.nextExDate
    });
    setEditingPos(null);
    resetForm();
  };

  const openEdit = (pos: PortfolioPosition) => {
    setEditingPos(pos);
    setFormData({
      ticker: pos.ticker,
      shares: pos.shares,
      purchasePrice: pos.purchasePrice,
      dividendAmount: pos.dividendAmount,
      frequency: pos.frequency,
      nextExDate: pos.nextExDate
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Portfolio</h1>
          <p className="text-muted-foreground">Manually manage your positions and dividend projections.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Position</DialogTitle>
              <DialogDescription>Enter your stock and dividend details manually.</DialogDescription>
            </DialogHeader>
            <PositionFormFields data={formData} onChange={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Save Position</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search ticker..." 
              className="pl-9 max-w-sm" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-muted">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold">Ticker</TableHead>
                  <TableHead className="font-bold">Shares</TableHead>
                  <TableHead className="font-bold">Avg. Price</TableHead>
                  <TableHead className="font-bold">Div / Share</TableHead>
                  <TableHead className="font-bold">Frequency</TableHead>
                  <TableHead className="font-bold">Next Ex-Date</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-semibold text-primary">{pos.ticker}</TableCell>
                    <TableCell>{pos.shares}</TableCell>
                    <TableCell>${pos.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell>${pos.dividendAmount.toFixed(3)}</TableCell>
                    <TableCell className="capitalize">{pos.frequency.replace('-', ' ')}</TableCell>
                    <TableCell>{pos.nextExDate}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => openEdit(pos)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deletePosition(pos.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPositions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No positions found. Add some to get started!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingPos} onOpenChange={(open) => !open && setEditingPos(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Position: {editingPos?.ticker}</DialogTitle>
            <DialogDescription>Update your holding or dividend information.</DialogDescription>
          </DialogHeader>
          <PositionFormFields data={formData} onChange={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPos(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Update Position</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PositionFormFields({ data, onChange }: { data: any, onChange: (d: any) => void }) {
  const update = (field: string, val: any) => onChange({ ...data, [field]: val });

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="ticker">Ticker Symbol</Label>
          <Input id="ticker" placeholder="AAPL" value={data.ticker} onChange={e => update('ticker', e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="shares">Shares Owned</Label>
          <Input id="shares" type="number" value={data.shares} onChange={e => update('shares', Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="price">Avg. Purchase Price</Label>
          <Input id="price" type="number" step="0.01" value={data.purchasePrice} onChange={e => update('purchasePrice', Number(e.target.value))} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="divAmount">Div. Amount (Per Share)</Label>
          <Input id="divAmount" type="number" step="0.001" value={data.dividendAmount} onChange={e => update('dividendAmount', Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Frequency</Label>
          <Select value={data.frequency} onValueChange={(v: any) => update('frequency', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="semi-monthly">Semi-Monthly (2x / Month)</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nextEx">Next Ex-Div Date</Label>
          <Input id="nextEx" type="date" value={data.nextExDate} onChange={e => update('nextExDate', e.target.value)} />
        </div>
      </div>
    </div>
  );
}
