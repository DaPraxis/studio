"use client"

import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PieChart, Calendar as CalendarIcon, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isAfter } from "date-fns";

export default function Dashboard() {
  const { positions, getAllDividends, isLoaded } = usePortfolio();

  if (!isLoaded) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const allDivs = getAllDividends();
  const now = new Date();
  
  // Future payouts based on payout date
  const upcomingDivs = allDivs.filter(d => isAfter(new Date(d.payoutDate), now));
  const totalUpcomingPayout = upcomingDivs.reduce((acc, d) => acc + (Number(d.totalAmount) || 0), 0);
  
  // Total principle currently deployed
  const totalPortfolioCost = positions.reduce((acc, p) => acc + (Number(p.totalCost) || 0), 0);
  
  // Annualized dividend income from projected window (approx 1 year)
  const annualIncome = allDivs.reduce((acc, d) => {
    return acc + (Number(d.totalAmount) || 0);
  }, 0);

  const yieldPercentage = totalPortfolioCost > 0 
    ? ((annualIncome / totalPortfolioCost) * 100).toFixed(2) 
    : "0.00";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Your portfolio is stored safely in your browser.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalPortfolioCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Across {positions.length} holdings</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Upcoming Dividends</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(totalUpcomingPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">{upcomingDivs.length} projected payouts</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Estimated Annual Income</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(annualIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-accent mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              {yieldPercentage}% Avg. Yield
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active holdings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-white shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg">Recent Dividends & Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDivs.slice(0, 5).map((div, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {div.ticker[0]}
                    </div>
                    <div>
                      <div className="font-semibold">{div.ticker}</div>
                      <div className="text-xs text-muted-foreground">Payout: {format(new Date(div.payoutDate), 'MMM dd, yyyy')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">+${Number(div.totalAmount || 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{div.sharesAtTime} shares</div>
                  </div>
                </div>
              ))}
              {upcomingDivs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming dividends tracked.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white shadow-sm border-none">
            <CardHeader>
              <CardTitle className="text-lg">Next Key Date</CardTitle>
            </CardHeader>
            <CardContent>
              {allDivs.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-accent">
                    {format(new Date(allDivs[0].payoutDate), 'MMM dd')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your next dividend payout from <strong>{allDivs[0].ticker}</strong> is arriving soon.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Add positions to track key dates.</p>
              )}
            </CardContent>
          </Card>
          
          <div className="p-6 rounded-xl bg-primary text-white space-y-3">
            <h3 className="font-bold">Pro Tip</h3>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              Export your data as a JSON file periodically from the History page to keep a permanent backup of your portfolio and calendar tweaks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendingUpIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
