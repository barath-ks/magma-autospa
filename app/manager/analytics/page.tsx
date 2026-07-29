"use client";
import { useState, useEffect } from "react";
import { Activity, DollarSign, ListOrdered, Award, UserPlus } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function AnalyticsPage() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  }, [range]);

  const hasData = data && data.txCount > 0;

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Revenue */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Revenue</div>
                  <DollarSign size={16} className="text-accent-gold" />
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  ${data.revenue.toFixed(2)}
                </div>
              </div>
              
              {/* Transactions */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Transactions</div>
                  <ListOrdered size={16} className="text-accent-gold" />
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {data.txCount}
                </div>
              </div>

              {/* Loyalty Points */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Loyalty Points</div>
                  <Award size={16} className="text-accent-gold" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-text-secondary w-16">Awarded:</span>
                    <span className="font-mono font-bold text-text-primary">+{data.pointsAwarded}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-text-secondary w-16">Redeemed:</span>
                    <span className="font-mono font-bold text-accent-gold">-{data.pointsRedeemed || 0}</span>
                  </div>
                </div>
              </div>

              {/* New Customers */}
              <div className="panel p-6 border-l-[3px] border-l-accent-gold hover:bg-bg-panel-elevated transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">New Customers</div>
                  <UserPlus size={16} className="text-accent-gold" />
                </div>
                <div className="text-3xl font-mono font-bold text-text-primary">
                  {data.newCustomers}
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
                        <td className="p-4 pr-6 text-right font-mono text-accent-gold font-bold text-sm">${service.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
