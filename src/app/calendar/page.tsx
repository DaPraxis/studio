"use client"

import { useState, useMemo } from 'react';
import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AIDividendExplainer } from '@/components/ai-dividend-explainer';

export default function DividendCalendar() {
  const { getAllDividends, isLoaded } = usePortfolio();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const allDivs = useMemo(() => getAllDividends(), [getAllDividends]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (date: Date) => {
    return allDivs.filter(div => 
      isSameDay(new Date(div.payoutDate), date) || isSameDay(new Date(div.exDate), date)
    );
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
        
        {/* Fill empty slots for start of month */}
        {[...Array(monthStart.getDay())].map((_, i) => (
          <div key={`empty-${i}`} className="h-24 md:h-32 border border-transparent" />
        ))}

        {days.map((day, i) => {
          const events = getEventsForDay(day);
          const hasEvents = events.length > 0;
          
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
                        "text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate font-medium",
                        isPayout ? "bg-primary text-white" : "bg-accent/20 text-accent"
                      )}
                    >
                      {ev.ticker} {isPayout ? `$${ev.totalAmount.toFixed(0)}` : 'Ex'}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDay && format(selectedDay, 'MMMM do, yyyy')}</DialogTitle>
            <DialogDescription>Scheduled events for this day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedDay && getEventsForDay(selectedDay).map((ev, i) => {
              const isPayout = isSameDay(new Date(ev.payoutDate), selectedDay);
              return (
                <div key={i} className="flex flex-col gap-3 p-4 border rounded-xl bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        {ev.ticker[0]}
                      </div>
                      <div>
                        <div className="font-bold text-lg">{ev.ticker}</div>
                        <Badge variant={isPayout ? "default" : "secondary"}>
                          {isPayout ? "Payout Date" : "Ex-Dividend Date"}
                        </Badge>
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
    </div>
  );
}