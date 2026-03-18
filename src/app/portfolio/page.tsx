"use client"

import { useState } from 'react';
import { usePortfolio } from "@/hooks/use-portfolio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, X, Check, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from 'date-fns';
import { getDividendsForTicker } from '@/lib/mock-data';

export default function Portfolio() {
  const { positions, addPosition, deletePosition, updatePosition, isLoaded } = usePortfolio();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add Form State
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState(0);
  const [newPrice, setNewPrice] = useState(0);

  if (!isLoaded) return <div className="p-8">Loading...</div>;

  const filteredPositions = positions.filter(p => 
    p.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!newTicker || newShares <= 0) return;
    addPosition({
      ticker: newTicker.toUpperCase(),
      shares: Number(newShares),
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      purchasePrice: Number(newPrice)
    });
    setNewTicker("");
    setNewShares(0);
    setNewPrice(0);
    setIsAddOpen(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Portfolio</h1>
          <p className="text-muted-foreground">Manage your stock positions and see dividend yields.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Position
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Position</DialogTitle>
              <DialogDescription>Enter the stock details to track its dividends.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ticker">Ticker Symbol</Label>
                <Input id="ticker" placeholder="e.g. AAPL" value={newTicker} onChange={e => setNewTicker(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shares">Shares Owned</Label>
                  <Input id="shares" type="number" value={newShares} onChange={e => setNewShares(Number(e.target.value))} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Purchase Price</Label>
                  <Input id="price" type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add Position</Button>
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
                  <TableHead className="font-bold">Latest Div / Share</TableHead>
                  <TableHead className="font-bold">Yield</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.map((pos) => {
                  const divData = getDividendsForTicker(pos.ticker)[0];
                  return (
                    <TableRow key={pos.id}>
                      <TableCell className="font-semibold text-primary">{pos.ticker}</TableCell>
                      <TableCell>{pos.shares}</TableCell>
                      <TableCell>${pos.purchasePrice.toFixed(2)}</TableCell>
                      <TableCell>{divData ? `$${divData.amountPerShare.toFixed(3)}` : 'N/A'}</TableCell>
                      <TableCell>
                        <span className="text-accent font-medium">{divData?.yield ? `${divData.yield}%` : 'N/A'}</span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Edit2 className="h-4 w-4" />
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
                  );
                })}
                {filteredPositions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No positions found. Add some to get started!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}