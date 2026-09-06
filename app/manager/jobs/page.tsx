"use client";
import { useState, useEffect } from "react";
import { ListOrdered, AlertCircle, RefreshCw } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { PaymentBadge } from "@/components/PaymentBadge";
import { formatCurrency } from "@/lib/format";

export default function ManagerJobsPage() {
  const [range, setRange] = useState("month");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchJobs = async (resetPage = false) => {
    const currentPage = resetPage ? 1 : page;
    if (resetPage) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(`/api/manager/jobs?range=${range}&page=${currentPage}`);
      const json = await res.json();
      if (res.ok) {
        if (json.jobs.length < 100) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        if (resetPage) {
          setJobs(json.jobs);
        } else {
          setJobs(prev => [...prev, ...json.jobs]);
        }
      }
    } catch (e) {
      console.error("Failed to load jobs", e);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchJobs(true);
  }, [range]);

  const loadMore = () => {
    setPage(p => p + 1);
  };

  useEffect(() => {
    if (page > 1) {
      fetchJobs(false);
    }
  }, [page]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-text-secondary flex items-center gap-1.5"><AlertCircle size={12}/> Pending</span>;
      case "in_progress":
        return <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-gold flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-accent-gold animate-pulse"></span> In Progress</span>;
      case "finished":
        return <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-copper flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-accent-copper"></span> Finished</span>;
      default:
        return <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-text-secondary flex items-center gap-1.5">{status}</span>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { 
      month: "short", 
      day: "numeric", 
      hour: "numeric", 
      minute: "2-digit" 
    }).format(date);
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto flex flex-col items-center h-full">
      <div className="w-full max-w-6xl self-start mb-8 flex justify-between items-end">
        <div>
          <Breadcrumbs items={[{ label: "Overview", href: "/manager" }, { label: "All Jobs" }]} accentClass="hover:text-accent-gold" />
          <h1 className="text-3xl font-semibold text-text-primary mt-2 flex items-center gap-3">
            <ListOrdered size={28} className="text-accent-gold" /> Branch Jobs
          </h1>
          <p className="text-text-secondary mt-1 text-sm uppercase tracking-wider">Read-only view of all transactions</p>
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

      <div className="w-full max-w-6xl">
        {loading ? (
          <p className="text-text-secondary text-sm uppercase tracking-widest font-mono animate-pulse">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <div className="panel p-12 flex flex-col items-center justify-center text-center border-l-[3px] border-l-accent-gold">
            <ListOrdered size={48} className="text-text-secondary mb-4 opacity-50" strokeWidth={1} />
            <h2 className="text-lg font-semibold text-text-primary mb-2">No Jobs Found</h2>
            <p className="text-sm text-text-secondary uppercase tracking-widest">
              There are no transactions recorded for {range === 'week' ? 'this week' : range === 'month' ? 'this month' : 'this year'}.
            </p>
          </div>
        ) : (
          <div className="panel overflow-hidden border-t-[3px] border-t-accent-gold">
            <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">Transactions Log</h2>
              <span className="text-xs font-mono text-text-secondary">Showing {jobs.length} jobs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Arrived</th>
                    <th className="p-4">Claimed</th>
                    <th className="p-4">Finished</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline bg-bg-panel">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-bg-panel-elevated transition-colors">
                      <td className="p-4 text-text-primary text-sm font-medium">{job.customer_name}</td>
                      <td className="p-4 text-text-secondary text-sm">{job.vehicle_model} <span className="font-mono text-xs opacity-70 ml-1">({job.vehicle_number})</span></td>
                      <td className="p-4 text-text-secondary text-sm">{job.service_name || "Unknown"}</td>
                      <td className="p-4">{getStatusBadge(job.status)}</td>
                      <td className="p-4">
                        {job.status === "finished" ? (
                          <div className="flex flex-col gap-0.5">
                            <PaymentBadge method={job.payment_method} size="sm" />
                            {job.total_amount && (
                              <span className="font-mono text-[10px] text-text-secondary">
                                {formatCurrency(job.total_amount)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-secondary/50 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {job.assigned_staff_name ? (
                          <span className="text-text-primary text-sm">{job.assigned_staff_name}</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">UNASSIGNED</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-text-secondary">{formatDate(job.created_at)}</td>
                      <td className="p-4 font-mono text-xs text-text-secondary">{formatDate(job.claimed_at)}</td>
                      <td className="p-4 font-mono text-xs text-text-secondary">{formatDate(job.finished_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {hasMore && (
              <div className="p-4 border-t border-border-hairline bg-bg-panel-elevated flex justify-center">
                <button 
                  onClick={loadMore} 
                  disabled={loadingMore}
                  className="px-6 py-2 border border-accent-gold text-accent-gold text-[10px] uppercase tracking-widest font-bold hover:bg-accent-gold hover:text-bg-base transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <><RefreshCw size={14} className="animate-spin" /> Loading...</>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
