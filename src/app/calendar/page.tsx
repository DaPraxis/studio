"use client"

import { useState, useMemo } from 'react';
import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AIDividendExplainer } from '@/components/ai-dividend-explainer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DividendCalendar() {
  const { getAllDividends, positions, updateManualAdjustment, isLoaded } = usePortfolio();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingDividend, setEditingDividend] = useState<any>(null);
  const [newDate, setNewDate] = useState("");

  const allDivs = useMemo(() => getAllDividends(), [getAllDividends]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (date: Date) => {
    return allDivs.filter(div => 
      isSameDay(new Date(div.payoutDate), date) || isSameDay(new Date(div.exDate), date)
    );
  };

  const handleUpdateDate = () => {
    if (!editingDividend || !newDate) return;
    
    const pos = positions.find(p => p.ticker === editingDividend.ticker);
    if (pos) {
      updateManualAdjustment(pos.id, editingDividend.index, newDate);
    }
    setEditingDividend(null);
    setNewDate("");
  };

  if (!isLoaded) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dividend Calendar</h1>
          <p className="text-muted-foreground">Track ex-dividend and payout dates across your portfolio.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-lg min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {[...Array(monthStart.getDay())].map((_, i) => (
          <div key={`empty-${i}`} className="h-24 md:h-32 border border-transparent" />
        ))}

        {days.map((day, i) => {
          const events = getEventsForDay(day);
          
          return (
            <div 
              key={i} 
              className={cn(
                "h-24 md:h-32 border rounded-xl p-2 bg-white transition-all cursor-pointer hover:shadow-md",
                isSameDay(day, new Date()) ? "border-accent ring-1 ring-accent" : "border-muted"
              )}
              onClick={() => setSelectedDay(day)}
            >
              <div className="text-right text-sm font-medium text-muted-foreground">{format(day, 'd')}</div>
              <div className="mt-1 space-y-1">
                {events.slice(0, 3).map((ev, idx) => {
                  const isPayout = isSameDay(new Date(ev.payoutDate), day);
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate font-medium flex items-center justify-between",
                        isPayout ? "bg-primary text-white" : "bg-accent/20 text-accent"
                      )}
                    >
                      <span className="truncate">{ev.ticker} {isPayout ? `$${ev.totalAmount.toFixed(0)}` : 'Ex'}</span>
                      {!isPayout && ev.status === 'edited' && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                    </div>
                  );
                })}
                {events.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center">+{events.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDay && format(selectedDay, 'MMMM do, yyyy')}</DialogTitle>
            <DialogDescription>Scheduled events for this day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedDay && getEventsForDay(selectedDay).map((ev, i) => {
              const isPayout = isSameDay(new Date(ev.payoutDate), selectedDay);
              const isExDate = isSameDay(new Date(ev.exDate), selectedDay);
              
              return (
                <div key={i} className="flex flex-col gap-3 p-4 border rounded-xl bg-muted/20 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        {ev.ticker[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-lg">{ev.ticker}</div>
                          <Badge 
                            variant={ev.status === 'edited' ? "default" : "outline"} 
                            className={cn(
                              "text-[10px] px-1.5 h-4 capitalize",
                              ev.status === 'edited' && "bg-accent hover:bg-accent"
                            )}
                          >
                            {ev.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isPayout ? "default" : "secondary"}>
                            {isPayout ? "Payout Date" : "Ex-Dividend Date"}
                          </Badge>
                          {isExDate && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingDividend(ev);
                                setNewDate(ev.exDate);
                              }}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">${ev.totalAmount.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{ev.sharesAtTime} Shares @ ${ev.amountPerShare.toFixed(3)}</div>
                    </div>
                  </div>
                  
                  <AIDividendExplainer input={{
                    ticker: ev.ticker,
                    eventType: isPayout ? 'payout' : 'ex-dividend',
                    eventDate: format(selectedDay, 'yyyy-MM-dd'),
                    dividendAmountPerShare: ev.amountPerShare,
                    sharesOwned: ev.sharesAtTime,
                    totalDividendAmount: ev.totalAmount
                  }} />
                </div>
              );
            })}
            {selectedDay && getEventsForDay(selectedDay).length === 0 && (
              <div className="text-center py-10 text-muted-foreground italic">No events scheduled for this date.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDividend} onOpenChange={() => setEditingDividend(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Event Date</DialogTitle>
            <DialogDescription>
              Changing this will shift all future projected dates for {editingDividend?.ticker}. Past dates will remain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Actual Ex-Dividend Date</Label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDividend(null)}>Cancel</Button>
            <Button onClick={handleUpdateDate}>Update & Shift Projections</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
