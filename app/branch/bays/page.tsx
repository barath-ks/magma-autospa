"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Layers, 
  ArrowLeft, 
  Plus, 
  RefreshCw, 
  Clock, 
  Car, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  ChevronRight,
  Zap,
  Building2
} from "lucide-react";
import { AddNewWorkWizard } from "@/components/AddNewWorkWizard";
import { CheckoutPaymentModal, PaymentMethod } from "@/components/CheckoutPaymentModal";

interface ActiveJob {
  id: string;
  status: "pending" | "in_progress" | "finished";
  total_amount?: number | null;
  payment_method?: string | null;
  created_at: string;
  claimed_at: string | null;
  finished_at: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  customer_name: string;
  assigned_staff_name: string | null;
  assigned_staff_id: string | null;
  service_name: string | null;
}

export default function BranchBaysPage() {
  const { data: session } = useSession();
  const branchName = session?.user?.name || "Main Branch";
  const branchCode = (session?.user as any)?.branch_code || (session?.user as any)?.login_id || "MAG-BRANCH-01";

  // Data States
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search
  const [filterTab, setFilterTab] = useState<"all" | "in_progress" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completingJob, setCompletingJob] = useState<ActiveJob | null>(null);
  const [formData, setFormData] = useState<{ services: any[]; staff: any[] }>({ services: [], staff: [] });

  const fetchJobs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/manager/jobs/active");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setErrorMsg(null);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to load bay queue");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Network error fetching bay queue");
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const res = await fetch("/api/manager/jobs/form-data");
      if (res.ok) {
        const data = await res.json();
        setFormData({ services: data.services || [], staff: data.staff || [] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchFormData();

    const interval = setInterval(() => {
      fetchJobs(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "finished") {
      const targetJob = jobs.find((j) => j.id === id);
      if (targetJob) {
        setCompletingJob(targetJob);
        return;
      }
    }

    setActionLoadingId(id);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/manager/jobs/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        await fetchJobs(true);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to update job status");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to communicate with server");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats
  const activeCount = jobs.length;
  const inProgressCount = jobs.filter((j) => j.status === "in_progress").length;
  const pendingCount = jobs.filter((j) => j.status === "pending").length;

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filterTab === "in_progress" && job.status !== "in_progress") return false;
      if (filterTab === "pending" && job.status !== "pending") return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const plate = (job.vehicle_number || "").toLowerCase();
        const model = (job.vehicle_model || "").toLowerCase();
        const customer = (job.customer_name || "").toLowerCase();
        const service = (job.service_name || "").toLowerCase();
        const id = job.id.toLowerCase();

        return (
          plate.includes(query) ||
          model.includes(query) ||
          customer.includes(query) ||
          service.includes(query) ||
          id.includes(query)
        );
      }

      return true;
    });
  }, [jobs, filterTab, searchQuery]);

  const formatJobTime = (timeStr: string | null) => {
    if (!timeStr) return "—";
    try {
      const d = new Date(timeStr.endsWith("Z") ? timeStr : timeStr + "Z");
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  const calculateElapsedMinutes = (timeStr: string | null) => {
    if (!timeStr) return null;
    try {
      const start = new Date(timeStr.endsWith("Z") ? timeStr : timeStr + "Z").getTime();
      return Math.max(0, Math.floor((Date.now() - start) / 60000));
    } catch {
      return null;
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
      {/* Top Floor Bar Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-hairline pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/branch/dashboard"
            className="p-2 text-text-secondary hover:text-text-primary border border-border-hairline hover:border-accent-copper transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-text-secondary">
              <Link href="/branch/dashboard" className="hover:text-accent-copper transition-colors">
                {branchName}
              </Link>
              <ChevronRight size={11} />
              <span className="text-text-primary font-bold">Floor Operations</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl text-text-primary tracking-tight mt-1">
              Active Bay Floor Queue
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => fetchJobs(true)}
            disabled={refreshing}
            className="p-2 text-text-secondary hover:text-accent-copper border border-border-hairline hover:border-accent-copper transition-colors disabled:opacity-50"
            title="Refresh queue"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-accent-copper" : ""} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-accent-copper text-white text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={14} />
            <span>Add New Work</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-accent-oxblood/10 border border-accent-oxblood/40 p-4 text-xs font-mono text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-accent-oxblood shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-text-secondary hover:text-white uppercase font-bold text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/20 border border-emerald-500/40 p-4 text-xs font-mono text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-text-secondary hover:text-white uppercase font-bold text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => setFilterTab("all")}
          className={`p-5 panel border-l-[3px] border-l-accent-copper flex flex-col justify-between cursor-pointer transition-all hover:bg-bg-panel-elevated ${
            filterTab === "all" ? "ring-1 ring-accent-copper/40 bg-bg-panel-elevated" : ""
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">
            Total Floor Queue
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-mono text-3xl font-bold text-text-primary">
              {activeCount.toString().padStart(2, "0")}
            </span>
            <Layers size={18} className="text-accent-copper opacity-60" />
          </div>
        </div>

        <div 
          onClick={() => setFilterTab("in_progress")}
          className={`p-5 panel border-l-[3px] border-l-amber-500 flex flex-col justify-between cursor-pointer transition-all hover:bg-bg-panel-elevated ${
            filterTab === "in_progress" ? "ring-1 ring-amber-500/40 bg-bg-panel-elevated" : ""
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">
            In Progress Bays
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-mono text-3xl font-bold text-amber-400">
              {inProgressCount.toString().padStart(2, "0")}
            </span>
            <Clock size={18} className="text-amber-500 opacity-60" />
          </div>
        </div>

        <div 
          onClick={() => setFilterTab("pending")}
          className={`p-5 panel border-l-[3px] border-l-blue-500 flex flex-col justify-between cursor-pointer transition-all hover:bg-bg-panel-elevated ${
            filterTab === "pending" ? "ring-1 ring-blue-500/40 bg-bg-panel-elevated" : ""
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">
            Pending Bays
          </span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="font-mono text-3xl font-bold text-blue-400">
              {pendingCount.toString().padStart(2, "0")}
            </span>
            <AlertCircle size={18} className="text-blue-500 opacity-60" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex border border-border-hairline bg-bg-panel p-1 text-[11px] font-mono uppercase tracking-wider">
          <button
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 font-bold transition-colors ${
              filterTab === "all" ? "bg-accent-copper text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            All Active ({activeCount})
          </button>
          <button
            onClick={() => setFilterTab("in_progress")}
            className={`px-3 py-1.5 font-bold transition-colors ${
              filterTab === "in_progress" ? "bg-amber-600 text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            onClick={() => setFilterTab("pending")}
            className={`px-3 py-1.5 font-bold transition-colors ${
              filterTab === "pending" ? "bg-blue-600 text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER TICKET, PLATE, MODEL..."
            className="w-full bg-bg-panel border border-border-hairline py-2 pl-9 pr-4 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:border-accent-copper focus:outline-none uppercase tracking-wider"
          />
        </div>
      </div>

      {/* Active Bay Queue Table */}
      <div className="panel overflow-hidden border-l-[3px] border-l-accent-copper relative shadow-lg">
        <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">
              Live Bay Queue
            </h2>
            <p className="text-[11px] font-mono text-text-secondary mt-0.5">
              Anchor: {branchName} ({branchCode})
            </p>
          </div>
          <div className="text-xs font-mono text-text-secondary">
            Showing <span className="text-text-primary font-bold">{filteredJobs.length}</span> of {activeCount}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Ticket</th>
                <th className="p-4">Vehicle &amp; Customer</th>
                <th className="p-4">Service</th>
                <th className="p-4">Floor Timings</th>
                <th className="p-4">Bay Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-secondary text-xs font-mono uppercase tracking-widest animate-pulse">
                    Loading floor bay queue...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-bg-panel-elevated border border-border-hairline flex items-center justify-center text-text-secondary">
                        <Layers size={22} />
                      </div>
                      <p className="text-text-primary font-serif text-lg">No active jobs in queue</p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-2 px-4 py-2 bg-accent-copper text-white text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all"
                      >
                        + Log Incoming Vehicle
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const elapsedMins = calculateElapsedMinutes(job.claimed_at || job.created_at);

                  return (
                    <tr key={job.id} className="hover:bg-bg-panel-elevated transition-colors">
                      {/* Ticket */}
                      <td className="p-4 align-top">
                        <div className="font-mono text-text-primary text-sm font-semibold">
                          #{job.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-[10px] font-mono text-accent-copper mt-1">
                          {branchCode}
                        </div>
                      </td>

                      {/* Vehicle & Customer */}
                      <td className="p-4 align-top">
                        <div className="font-medium text-text-primary">
                          {job.vehicle_model || "Unknown Model"}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-block px-2 py-0.5 bg-bg-base border border-border-hairline text-amber-200 font-mono text-[11px] font-bold tracking-widest">
                            {job.vehicle_number || "NO PLATE"}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {job.customer_name}
                          </span>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="p-4 align-top">
                        <div className="text-text-primary text-xs font-medium">
                          {job.service_name || "Standard Wash"}
                        </div>
                      </td>

                      {/* Timings */}
                      <td className="p-4 align-top">
                        <div className="text-[11px] font-mono text-text-secondary uppercase space-y-1">
                          <div className="flex gap-2">
                            <span className="w-16 text-text-secondary/70">ARRIVED:</span>
                            <span className="text-text-primary">{formatJobTime(job.created_at)}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="w-16 text-text-secondary/70">CLAIMED:</span>
                            <span className="text-text-primary">{formatJobTime(job.claimed_at)}</span>
                          </div>
                          {elapsedMins !== null && (
                            <div className="flex gap-2 items-center text-accent-copper font-bold pt-0.5">
                              <Clock size={11} />
                              <span>{elapsedMins} min in bay</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown & Actions */}
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2">
                          <select
                            value={job.status}
                            onChange={(e) => handleStatusChange(job.id, e.target.value)}
                            disabled={actionLoadingId === job.id}
                            className={`w-full appearance-none bg-bg-base border px-3 py-2 text-xs font-bold uppercase tracking-widest cursor-pointer focus:outline-none focus:border-accent-copper transition-colors ${
                              actionLoadingId === job.id ? "opacity-50 cursor-not-allowed" : "hover:bg-bg-panel-elevated"
                            } ${
                              job.status === "in_progress"
                                ? "text-amber-400 border-amber-500/40"
                                : job.status === "pending"
                                ? "text-blue-400 border-blue-500/40"
                                : "text-emerald-400 border-emerald-500/40"
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="finished">Finished (Complete)</option>
                          </select>

                          {job.status === "pending" && (
                            <button
                              onClick={() => handleStatusChange(job.id, "in_progress")}
                              disabled={actionLoadingId === job.id}
                              className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-bg-base border border-amber-500/30 transition-all text-center disabled:opacity-50"
                            >
                              Start Work &rarr;
                            </button>
                          )}

                          {job.status === "in_progress" && (
                            <button
                              onClick={() => handleStatusChange(job.id, "finished")}
                              disabled={actionLoadingId === job.id}
                              className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-bg-base border border-emerald-500/30 transition-all text-center disabled:opacity-50"
                            >
                              Complete Job &rarr;
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Work Wizard Modal */}
      {isModalOpen && (
        <AddNewWorkWizard
          formData={formData}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            setSuccessMsg("Vehicle work successfully logged to bay queue!");
            setTimeout(() => setSuccessMsg(null), 4000);
            fetchJobs(true);
          }}
          accentColor="copper"
        />
      )}

      {/* Checkout & Payment Modal */}
      {completingJob && (
        <CheckoutPaymentModal
          job={completingJob}
          accentColor="copper"
          onClose={() => setCompletingJob(null)}
          onSuccess={(method) => {
            setCompletingJob(null);
            setSuccessMsg(`Job finished! Payment logged via ${method.toUpperCase()} & loyalty points credited.`);
            setTimeout(() => setSuccessMsg(null), 4000);
            fetchJobs(true);
          }}
        />
      )}
    </main>
  );
}
