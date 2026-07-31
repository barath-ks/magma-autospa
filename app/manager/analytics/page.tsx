"use client";
import { useState, useEffect } from "react";
import { Activity, DollarSign, ListOrdered, Award, UserPlus, TrendingUp } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { formatCurrency } from "@/lib/format";

export default function AnalyticsPage() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Expenses state
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesLoading, setExpensesLoading] = useState(true);
  
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmt, setExpenseAmt] = useState("");
  const [submittingExpense, setSubmittingExpense] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/manager/analytics?range=${range}`);
        const json = await res.json();
        if (res.ok) setData(json);
      } catch (e) {
        console.error("Failed to load analytics", e);
      }
      setLoading(false);
    };

    fetchAnalytics();
    fetchExpenses();
  }, [range]);

  const fetchExpenses = async () => {
    setExpensesLoading(true);
    try {
      const res = await fetch(`/api/manager/expenses?range=${range}`);
      const json = await res.json();
      if (res.ok) {
        setExpenses(json.expenses || []);
        setTotalExpenses(json.totalSum || 0);
      }
    } catch (e) {
      console.error("Failed to load expenses", e);
    }
    setExpensesLoading(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseAmt) return;
    setSubmittingExpense(true);
    try {
      const res = await fetch("/api/manager/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: expenseDesc, amount: expenseAmt })
      });
      if (res.ok) {
        setExpenseDesc("");
        setExpenseAmt("");
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add expense");
      }
    } catch (e) {
      console.error("Failed to add expense", e);
    }
    setSubmittingExpense(false);
  };

  const hasData = data && data.txCount > 0;
  const profit = (data?.revenue || 0) - totalExpenses;
  const isLoss = profit < 0;

  const profitStr = formatCurrency(profit);
  const revenueStr = formatCurrency(data?.revenue || 0);
  const txStr = String(data?.txCount || 0);
  const customersStr = String(data?.newCustomers || 0);
  const pointsAwardedStr = `+${data?.pointsAwarded || 0}`;
  const pointsRedeemedStr = data?.pointsRedeemed ? `-${data.pointsRedeemed}` : '0';

  const getFontSize = (str: string) => {
    if (str.length >= 11) return "text-base lg:text-sm xl:text-lg";
    if (str.length >= 8) return "text-lg lg:text-base xl:text-xl";
    return "text-2xl lg:text-xl xl:text-2xl";
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col items-center h-full">
      <div className="w-full max-w-5xl self-start mb-8 flex justify-between items-end">
        <div>
          <Breadcrumbs items={[{ label: "Overview", href: "/manager" }, { label: "Branch Analytics" }]} accentClass="hover:text-accent-gold" />
          <h1 className="text-3xl font-semibold text-text-primary mt-2 flex items-center gap-3">
            <Activity size={28} className="text-accent-gold" /> Branch Analytics
          </h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Performance metrics for your location</p>
        </div>
        
        {/* Range Selector */}
        <div className="flex bg-bg-panel border border-border-hairline p-1">
          {[
            { id: "week", label: "This Week" },
            { id: "month", label: "This Month" },
            { id: "year", label: "This Year" }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                range === r.id 
                  ? "bg-accent-gold text-bg-base" 
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-panel-elevated"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-5xl space-y-8">
        
        {loading ? (
          <p className="text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading analytics...</p>
        ) : !hasData ? (
          <div className="panel p-12 flex flex-col items-center justify-center text-center border-l-[3px] border-l-accent-gold">
            <Activity size={48} className="text-text-secondary mb-4 opacity-50" strokeWidth={1} />
            <h2 className="text-lg font-semibold text-text-primary mb-2">No Data Yet</h2>
            <p className="text-sm text-text-secondary uppercase tracking-widest">
              There are no transactions recorded for {range === 'week' ? 'this week' : range === 'month' ? 'this month' : 'this year'}.
            </p>
          </div>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {/* Profit */}
              <div className={`panel p-6 border-l-[3px] ${isLoss ? 'border-l-accent-oxblood bg-bg-panel-elevated' : 'border-l-[#4ade80]'} hover:bg-bg-panel-elevated transition-colors`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Profit Margin</div>
                  <TrendingUp size={16} className={isLoss ? 'text-accent-oxblood' : 'text-[#4ade80]'} />
                </div>
                <div className={`${getFontSize(profitStr)} font-mono font-bold whitespace-nowrap tracking-tight ${isLoss ? 'text-accent-oxblood' : 'text-[#4ade80]'}`}>
                  {profitStr}
                </div>
              </div>

              {/* Revenue */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Revenue</div>
                  <DollarSign size={16} className="text-accent-gold" />
                </div>
                <div className={`${getFontSize(revenueStr)} font-mono font-bold whitespace-nowrap tracking-tight text-text-primary`}>
                  {revenueStr}
                </div>
              </div>
              
              {/* Transactions */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Transactions</div>
                  <ListOrdered size={16} className="text-accent-gold" />
                </div>
                <div className={`${getFontSize(txStr)} font-mono font-bold whitespace-nowrap tracking-tight text-text-primary`}>
                  {txStr}
                </div>
              </div>

              {/* Loyalty Points */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Loyalty Points</div>
                  <Award size={16} className="text-accent-gold" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-text-secondary w-16">Awarded:</span>
                    <span className={`font-mono font-bold text-text-primary whitespace-nowrap tracking-tight ${getFontSize(pointsAwardedStr)}`}>{pointsAwardedStr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-text-secondary w-16">Redeemed:</span>
                    <span className={`font-mono font-bold text-accent-gold whitespace-nowrap tracking-tight ${getFontSize(pointsRedeemedStr)}`}>{pointsRedeemedStr}</span>
                  </div>
                </div>
              </div>

              {/* New Customers */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">New Customers</div>
                  <UserPlus size={16} className="text-accent-gold" />
                </div>
                <div className={`${getFontSize(customersStr)} font-mono font-bold whitespace-nowrap tracking-tight text-text-primary`}>
                  {customersStr}
                </div>
              </div>
            </div>

            {/* Top 5 Services Table */}
            <div className="panel overflow-hidden border-t-[3px] border-t-accent-gold">
              <div className="p-6 border-b border-border-hairline bg-bg-base">
                <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">Top Services by Frequency</h2>
              </div>
              
              {data.topServices.length === 0 ? (
                <div className="p-8 text-center text-text-secondary uppercase tracking-widest text-sm">No services sold in this period.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
                    <tr>
                      <th className="p-4 pl-6">Service Name</th>
                      <th className="p-4 text-right">Times Sold</th>
                      <th className="p-4 pr-6 text-right">Revenue Driven</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-hairline bg-bg-panel">
                    {data.topServices.map((service: any, idx: number) => (
                      <tr key={idx} className="hover:bg-bg-panel-elevated transition-colors">
                        <td className="p-4 pl-6 text-text-primary text-sm font-medium">{service.name}</td>
                        <td className="p-4 text-right font-mono text-text-secondary text-sm">{service.count}</td>
                        <td className="p-4 pr-6 text-right font-mono text-accent-gold font-bold text-sm">{formatCurrency(service.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Expenses Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Expense Form */}
              <div className="panel p-6 border-l-[3px] border-l-accent-oxblood flex flex-col">
                <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-6">Log Expense</h2>
                <form onSubmit={handleAddExpense} className="flex-1 flex flex-col">
                  <div className="mb-4">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Description</label>
                    <input 
                      type="text" 
                      required 
                      value={expenseDesc} 
                      onChange={e => setExpenseDesc(e.target.value)} 
                      placeholder="e.g. Cleaning Supplies"
                      className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Amount (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      required 
                      value={expenseAmt} 
                      onChange={e => setExpenseAmt(e.target.value)} 
                      placeholder="0.00"
                      className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={submittingExpense || !expenseDesc || !expenseAmt}
                    className="mt-auto w-full py-3 bg-accent-oxblood text-white text-xs font-bold uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                  >
                    {submittingExpense ? "Logging..." : "Log Expense"}
                  </button>
                </form>
              </div>

              {/* Expense List */}
              <div className="panel overflow-hidden border-t-[3px] border-t-accent-oxblood lg:col-span-2 flex flex-col">
                <div className="p-6 border-b border-border-hairline bg-bg-base flex justify-between items-center">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">Logged Expenses</h2>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Total (Selected Range)</div>
                    <div className="text-lg font-mono font-bold text-accent-oxblood">{formatCurrency(totalExpenses)}</div>
                  </div>
                </div>
                
                {expensesLoading ? (
                  <div className="p-8 text-center text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading expenses...</div>
                ) : expenses.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary text-sm uppercase tracking-widest flex-1 flex flex-col items-center justify-center">
                    No expenses logged in this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto flex-1 max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-bg-panel-elevated border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium sticky top-0">
                        <tr>
                          <th className="p-4 pl-6">Date</th>
                          <th className="p-4">Description</th>
                          <th className="p-4">Entered By</th>
                          <th className="p-4 pr-6 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-hairline bg-bg-panel">
                        {expenses.map((exp: any) => (
                          <tr key={exp.id} className="hover:bg-bg-panel-elevated transition-colors">
                            <td className="p-4 pl-6 text-text-secondary text-sm font-mono">
                              {new Date(exp.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-text-primary text-sm font-medium">{exp.description}</td>
                            <td className="p-4 text-text-secondary text-xs">{exp.entered_by_name}</td>
                            <td className="p-4 pr-6 text-right font-mono text-accent-oxblood font-bold text-sm">
                              {formatCurrency(exp.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
