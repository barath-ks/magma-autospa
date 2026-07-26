"use client";
import { useState, useEffect } from "react";
import { Check, X, AlertCircle } from "lucide-react";

export default function ManagerDashboard() {
  const [usernameRequests, setUsernameRequests] = useState<any[]>([]);
  const [usernameActionLoading, setUsernameActionLoading] = useState(false);
  const [rejectUsernameId, setRejectUsernameId] = useState<string | null>(null);
  const [rejectUsernameNote, setRejectUsernameNote] = useState("");

  useEffect(() => {
    fetchUsernameRequests();
  }, []);

  const fetchUsernameRequests = async () => {
    try {
      const res = await fetch("/api/manager/username-requests");
      const data = await res.json();
      if (data.requests) setUsernameRequests(data.requests);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUsernameApprove = async (id: string) => {
    setUsernameActionLoading(true);
    try {
      const res = await fetch("/api/manager/username-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.auto_rejected) alert(data.message);
        fetchUsernameRequests();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setUsernameActionLoading(false);
  };

  const handleUsernameReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectUsernameId || !rejectUsernameNote) return;
    setUsernameActionLoading(true);
    try {
      const res = await fetch("/api/manager/username-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectUsernameId, status: "rejected", reviewer_note: rejectUsernameNote })
      });
      if (res.ok) {
        setRejectUsernameId(null);
        setRejectUsernameNote("");
        fetchUsernameRequests();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setUsernameActionLoading(false);
  };

  return (
    <main className="flex-1 p-8 lg:p-12 overflow-auto">
      <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-semibold text-text-primary">Branch Overview</h1>
            <p className="text-text-secondary mt-2 text-sm uppercase tracking-wider">Daily metrics and staff utilization.</p>
          </div>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Revenue Today</span>
            <span className="font-mono text-3xl text-text-primary mt-3">$4,250</span>
          </div>
          <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Vehicles Processed</span>
            <span className="font-mono text-3xl text-text-primary mt-3">18</span>
          </div>
          <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Active Staff</span>
            <span className="font-mono text-3xl text-text-primary mt-3">4</span>
          </div>
          <div className="panel p-6 border-l-[3px] border-l-accent-gold flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">CSAT Score</span>
            <span className="font-mono text-3xl text-text-primary mt-3">4.9</span>
          </div>
        </div>

        {/* Username Requests Queue */}
        {usernameRequests.length > 0 && (
          <div className="mb-10 panel p-6 border-l-[3px] border-l-accent-gold">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-accent-gold" /> Pending Staff ID Changes
            </h2>
            <div className="space-y-3">
              {usernameRequests.map(req => (
                <div key={req.id} className="bg-bg-base border border-border-hairline p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Current ID</div>
                    <div className="font-mono text-sm text-text-primary">{req.current_login_id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Requested ID</div>
                    <div className="font-mono text-sm text-accent-gold">{req.requested_login_id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRejectUsernameId(req.id)} disabled={usernameActionLoading} className="px-3 py-1.5 border border-border-hairline text-[10px] uppercase tracking-widest font-bold hover:bg-accent-oxblood hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1">
                      <X size={12}/> Reject
                    </button>
                    <button onClick={() => handleUsernameApprove(req.id)} disabled={usernameActionLoading} className="px-3 py-1.5 bg-accent-gold text-bg-base text-[10px] uppercase tracking-widest font-bold hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center gap-1">
                      <Check size={12}/> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff Table */}
        <div className="panel overflow-hidden border-l-[3px] border-l-border-hairline-strong">
          <div className="p-5 border-b border-border-hairline flex justify-between items-center bg-bg-panel-elevated">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-primary">Active Staff Roster</h2>
          </div>
          <table className="w-full text-left">
            <thead className="bg-bg-panel border-b border-border-hairline text-text-secondary uppercase text-[10px] tracking-[0.2em] font-medium">
              <tr>
                <th className="p-4">Staff ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Shift</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline bg-bg-panel">
              <tr className="hover:bg-bg-panel-elevated transition-colors">
                <td className="p-4 font-mono text-text-primary text-sm">MAG-0001</td>
                <td className="p-4 text-text-primary text-sm font-medium">Alex Chen</td>
                <td className="p-4 text-text-secondary text-sm">08:00 - 16:00</td>
                <td className="p-4">
                  <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-gold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-accent-gold animate-pulse"></span> On Duty
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-bg-panel-elevated transition-colors">
                <td className="p-4 font-mono text-text-primary text-sm">MAG-0002</td>
                <td className="p-4 text-text-primary text-sm font-medium">Sarah Miller</td>
                <td className="p-4 text-text-secondary text-sm">10:00 - 18:00</td>
                <td className="p-4">
                  <span className="text-[10px] uppercase tracking-[0.1em] font-medium text-accent-gold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-accent-gold animate-pulse"></span> On Duty
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {rejectUsernameId && (
          <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="panel border-l-[3px] border-l-accent-oxblood p-8 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-2 text-text-primary">Reject ID Request</h3>
              <p className="text-xs font-mono text-text-secondary mb-6 uppercase tracking-wider">Please provide a reason.</p>
              <form onSubmit={handleUsernameReject}>
                <div className="mb-6">
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-bold mb-2 text-text-secondary">Manager Note *</label>
                  <input required autoFocus type="text" value={rejectUsernameNote} onChange={e=>setRejectUsernameNote(e.target.value)} className="w-full bg-bg-base border border-border-hairline-strong p-3 text-text-primary font-mono text-sm focus:border-accent-oxblood focus:outline-none transition-colors" />
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-border-hairline">
                  <button type="button" onClick={() => setRejectUsernameId(null)} className="px-4 py-2 font-medium text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                  <button type="submit" disabled={usernameActionLoading || !rejectUsernameNote} className="px-6 py-2 font-bold text-xs uppercase tracking-widest bg-accent-oxblood text-white hover:bg-opacity-90 disabled:opacity-50 transition-colors">
                    {usernameActionLoading ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
  );
}
