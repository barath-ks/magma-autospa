"use client";
import { useState, useEffect } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { AlertCircle, X, Check, Calendar } from "lucide-react";

export default function ManagerSchedulePage() {
  const [pending, setPending] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reject Modal state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/schedule");
      const data = await res.json();
      if (data.pending) setPending(data.pending);
      if (data.schedule) setSchedule(data.schedule);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/manager/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" })
      });
      if (res.ok) {
        fetchSchedule();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectNote) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/manager/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectId, status: "rejected", manager_note: rejectNote })
      });
      if (res.ok) {
        setRejectId(null);
        setRejectNote("");
        fetchSchedule();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <Breadcrumbs items={[{ label: "Overview", href: "/manager" }, { label: "Schedule" }]} accentClass="hover:text-accent-gold" />
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Branch Schedule</h1>
          <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Review shift requests and manage coverage.</p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
          <AlertCircle size={16} /> Pending Requests
        </h2>
        {loading ? (
          <div className="text-text-secondary text-xs font-mono uppercase animate-pulse">Loading...</div>
        ) : pending.length === 0 ? (
          <div className="panel p-8 text-center text-text-secondary text-sm font-mono uppercase tracking-widest">
            No pending requests to review.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(req => (
              <div key={req.id} className="panel p-5 border-l-[3px] border-l-accent-gold flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Staff</div>
                    <div className="text-sm font-medium text-text-primary">{req.staff_name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Date</div>
                    <div className="font-mono text-sm text-text-primary">{new Date(req.requested_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Time</div>
                    <div className="font-mono text-sm text-text-primary">{req.start_time} - {req.end_time}</div>
                  </div>
                  {req.staff_note && (
                    <div className="hidden lg:block">
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Note</div>
                      <div className="text-xs text-text-primary italic">"{req.staff_note}"</div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setRejectId(req.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-primary bg-bg-panel-elevated hover:bg-accent-oxblood hover:text-white transition-colors flex items-center gap-2 border border-border-hairline disabled:opacity-50"
                  >
                    <X size={14} /> Reject
                  </button>
                  <button 
                    onClick={() => handleApprove(req.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-accent-gold text-bg-base hover:bg-opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check size={14} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-4 flex items-center gap-2">
          <Calendar size={16} /> Approved Schedule (Upcoming)
        </h2>
        {loading ? (
          <div className="text-text-secondary text-xs font-mono uppercase animate-pulse">Loading...</div>
        ) : schedule.length === 0 ? (
          <div className="panel p-8 text-center text-text-secondary text-sm font-mono uppercase tracking-widest">
            No approved shifts scheduled.
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Start Time</th>
                  <th className="p-4">End Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline bg-bg-base">
                {schedule.map(shift => (
                  <tr key={shift.id} className="hover:bg-bg-panel-elevated transition-colors">
                    <td className="p-4 font-mono text-text-primary text-sm">{new Date(shift.requested_date).toLocaleDateString()}</td>
                    <td className="p-4 text-text-primary text-sm font-medium">{shift.staff_name}</td>
                    <td className="p-4 font-mono text-text-primary text-sm">{shift.start_time}</td>
                    <td className="p-4 font-mono text-text-primary text-sm">{shift.end_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectId && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-2 text-text-primary">Reject Shift Request</h3>
            <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">Please provide a reason for rejection.</p>
            
            <form onSubmit={handleReject}>
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Manager Note *</label>
                <input 
                  required 
                  autoFocus
                  type="text" 
                  value={rejectNote} 
                  onChange={e=>setRejectNote(e.target.value)} 
                  className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" 
                  placeholder="e.g. Need coverage on Friday instead" 
                />
              </div>
              
              <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                <button type="button" onClick={() => setRejectId(null)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                <button type="submit" disabled={actionLoading || !rejectNote} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
